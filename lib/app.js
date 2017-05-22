const { ChromeLauncher } = require('lighthouse/lighthouse-cli/chrome-launcher');
const capture = require('./capture');
const chrome = require('chrome-remote-interface');
const fs = require('fs');
const promisify = require('es6-promisify');
// const testUrl = 'file:///C:/Users/mathieub/Devs/myvideo.mp4';

const readFile = promisify(fs.readFile);
const getAbsolutePath = promisify(fs.realpath);

/**
 * Launches a debugging instance of Chrome on port 9222.
 * @param {boolean=} headless True (default) to launch Chrome in headless mode.
 *     Set to false to launch Chrome normally.
 * @return {Promise<ChromeLauncher>}
 */
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
      }, console.error);
    });
}

function onPageLoad(Page) {
  console.log('Handling on page load event');
  return capture.StartCheapScreencast(Page, 3000, 10);
}


module.exports = {
  init(testUrl)
  {
    // return resetOutDir()
    //   .then(() => {
    return launchChrome()
      .then(launcher => {
        chrome(protocol => {
          // Extract the parts of the DevTools protocol we need for the task.
          // See API docs: https://chromedevtools.github.io/devtools-protocol/
          const {
            Page, Runtime
          } = protocol;

          function killChrome() {
            protocol.close();
            launcher.kill(); // Kill Chrome.
          }

          Promise.all([Page.enable(), Runtime.enable()])
            .then(() => {
              getAbsolutePath('./lib/empty.html')
            })
            .then((absolutePath) => Page.navigate({ url: `file:///${absolutePath}`}))
            .then(() => readFile('./lib/iframe_api.js', 'utf8'))
            .then((script) => {

              Runtime.evaluate({expression: script});
              // Wait for window.onload before doing stuff.
              Page.loadEventFired(() => {
                console.log('load event fired');
                onPageLoad(Page)
                  .then(() => {
                    console.log("Done capturing, image files are in out folder");
                    killChrome();
                    process.exit(0);
                  })
                  .catch((e) => {
                    console.log("Error while starting capture: " + e.message);
                    killChrome();
                    process.exit(-1);
                  });
              });

            })
            .catch((err) => console.log(err));

        }).on('error', err => {
          throw Error('Cannot connect to Chrome:' + err);
        });
      }, (err) => {
        console.error(err);
        killChrome();
        process.exit(-1);
      });
  }
};
