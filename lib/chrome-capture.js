const fs = require('fs');
const promisify = require('es6-promisify');
const { ChromeLauncher } = require('lighthouse/lighthouse-cli/chrome-launcher');
const chrome = require('chrome-remote-interface');
const debug = require('debug')('chrome-capture');


// promisified core node functions
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const rename = promisify(fs.rename);
const readFile = promisify(fs.readFile);
const getAbsolutePath = promisify(fs.realpath);


function onPageLoad(Page) {
  debug('Handling on page load event');
  return StartCheapScreencast(Page, 10);
}


function launchChrome(headless = true) {
  const launcher = new ChromeLauncher({
    port: 9222,
    autoSelectChrome: true, // False to manually select which Chrome install.
    additionalFlags: [
      '--window-size=1920,1080',
      '--disable-gpu',
      headless ? '--headless' : ''
    ],
  });

  return launcher.run().then(() => launcher)
    .catch(err => {
      return launcher.kill().then(() => { // Kill Chrome if there's an error.
        throw err;
      }, debug);
    });
}

function StartCheapScreencast(Page,  targetedFps, duration = -1, delay = 0) {
  debug('Starting screenshot capture');
  let promise = new Promise((resolve, reject) => {

    setTimeout(() => { // we may want to delay the capture
      try {
        let rate = Math.floor(1000 / targetedFps);
        let interval = setInterval(() => {

          unlink('./out/frame.jpeg')
            .catch((e) => {
              if (e.errno === -2) {
                debug('frame.jpeg does not exist, but it\'s okay buddy');
                return Promise.resolve();
              }
            })
            .then(() => {
              debug('Capturing frame');
              return Page.captureScreenshot({
                format: "jpeg",
                quality: 100,
                fromSurface: true
              });

            })
            .then(frame =>
              writeFile(`./out/frame.temp`, Buffer.from(frame.data, 'base64'))
            )
            .then(() => rename('./out/frame.temp', './out/frame.jpeg'))
            .catch((e) => {
              debug(e)
            })
        }, rate);

        if (duration > 0) {
          setTimeout(() => {
            resolve();
          }, duration)
        }
      } catch (e) {
        reject(e);
      }
    }, delay);
  });

  return promise;
}


function init(testUrl) {
  return launchChrome()
    .then(launcher => {
      chrome(protocol => {
        const {
          Page, Runtime
        } = protocol;

        function killChrome() {
          protocol.close();
          launcher.kill(); // Kill Chrome.
        }

        Promise.all([Page.enable(), Runtime.enable()])
          .then(() => getAbsolutePath('./lib/empty.html'))
          .then((absolutePath) => Page.navigate({url: `file:///${absolutePath}`}))
          .then(() => readFile('./lib/iframe_api.js', 'utf8'))
          .then((script) => {

            Runtime.evaluate({expression: script});
            // Wait for window.onload before doing stuff.
            Page.loadEventFired(() => {
              debug('load event fired');
              onPageLoad(Page)
                .then(() => {
                  debug("Done capturing, image files are in out folder");
                  killChrome();
                  process.exit(0);
                })
                .catch((e) => {
                  debug("Error while starting capture: " + e.message);
                  killChrome();
                  process.exit(-1);
                });
            });

          })
          .catch((err) => debug(err));

      }).on('error', err => {
        throw Error('Cannot connect to Chrome:' + err);
      });
    })
    .then((err) => {
      debug(err);
      killChrome();
      process.exit(-1);
    });
}

module.exports = {
  init
};
