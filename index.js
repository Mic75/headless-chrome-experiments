const {ChromeLauncher} = require('lighthouse/lighthouse-cli/chrome-launcher');
const chrome = require('chrome-remote-interface');
const fs = require('fs');

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

function startScreencast(Page) {
  let promise = new Promise((resolve, reject) => {
    try {
      // handle frame capture
      Page.screencastFrame((frame) => {
        console.log('Frame captured');
        console.log(`Session Id: ${frame.sessionId}`);
        fs.writeFile(`./out/img_${frame.sessionId}.jpeg`, Buffer.from(frame.data, "base64"));
      });

      // start screen casting
      Page.startScreencast({format: 'jpeg'});

      // stop screen capture afer 3 secs
      setTimeout(() => {
        Page.stopScreencast();
        resolve();
      }, 10000);
    }
    catch (e) {
      reject(e);
    }
  });

  return promise;
}

function startCheapScreencast(Page, duration, targetedFps) {
  let promise = new Promise((resolve, reject) => {
    try {
      let rate = Math.floor(1000 / targetedFps);
      let frameId = 0;

      let interval = setInterval(() => {
        try {
          Page.captureScreenshot({
            format: "jpeg",
            quality: 100
          }).then(data => {
            fs.writeFile(`./out/frame_${frameId}.jpeg`, Buffer.from(data, 'base64'), err => {
              if (err) {
                clearInterval(interval);
                reject(err); // we stop at the first failing capture
              }
              else {
                resolve();
              }
            });
          });
          frameId++;
        }
        catch (e) {
          clearInterval(interval);
          reject(e);
        }
      }, rate);

      setTimeout(() => {
        resolve();
      }, duration)
    }
    catch (e) {
      reject(e);
    }

  });

  return promise;
}

function simpleScreenShot(Page) {
  let promise = new Promise((resolve, reject) => {

    // we wait for the video to be started
    setTimeout(() => {
      Page.captureScreenshot({
        format: "jpeg"
      })
          .then((data) => {
            fs.writeFile(`./out/screenshot.jpeg`, Buffer.from(data, 'base64'), (err) => {
              if (err) {
                reject(err);
              }
              else {
                resolve();
              }
            });
          })
          .catch(e => reject(e));
    }, 1000);
  });

  return promise;
}

function onPageLoad(Page) {

  // return startScreencast(Page);
  // return startCheapScreencast(Page, 10, 10);
  return simpleScreenShot(Page);
}

launchChrome().then(launcher => {

  chrome(protocol => {
    // Extract the parts of the DevTools protocol we need for the task.
    // See API docs: https://chromedevtools.github.io/devtools-protocol/
    const {Page} = protocol;

    function killChrome() {
      protocol.close();
      launcher.kill(); // Kill Chrome.
    }

    // First, need to enable the domains we're going to use.
    Page.enable().then(() => {
      Page.navigate({url: 'https://www.youtube.com/embed/8lWpnvNxs8k?autoplay=1'});


      // Wait for window.onload before doing stuff.
      Page.loadEventFired(() => {
        onPageLoad(Page)
            .then(() => {
              console.log("Done capturing, image files are in out folder");
              killChrome();
            })
            .catch((e) => {
              console.log("Error while starting capture: " + e.message);
              killChrome();
            });
      });

    });

  }).on('error', err => {
    throw Error('Cannot connect to Chrome:' + err);
  });

});


