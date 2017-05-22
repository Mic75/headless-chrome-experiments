const fs = require('fs');
const promisify = require('es6-promisify');

// promisified core node functions
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const rename = promisify(fs.rename);

function resetOutDir() {
  console.log('resetOutDir');
  let promise = new Promise((resolve, reject) => {
    fs.rmdir('./out', (err) => {
      if (err) {
        reject('Can\'t remove output dir');
      } else {
        fs.mkdir('out', (err) => {
          if (err) {
            reject('Can\'t create output dir')
          } else {
            resolve();
          }
        });
      }
    });
  });
  return promise;
}

function StartScreencast(Page) {
  let promise = new Promise((resolve, reject) => {
    try {
      // handle frame capture
      Page.screencastFrame((frame) => {
        console.log('Frame captured');
        console.log(`Session Id: ${frame.sessionId}`);
        writeFile(`./out/img_${frame.sessionId}.jpeg`, Buffer.from(frame.data, "base64"));
      });

      // start screen casting
      Page.startScreencast({
        format: 'jpeg'
      });

      // stop screen capture afer 3 secs
      setTimeout(() => {
        Page.stopScreencast();
        resolve();
      }, 10000);
    } catch (e) {
      reject(e);
    }
  });

  return promise;
}

function StartCheapScreencast(Page, duration, targetedFps, delay = 0) {
  console.log('Starting screenshot capture');
  let promise = new Promise((resolve, reject) => {

    setTimeout(() => { // we may want to delay the capture
      try {
        let rate = Math.floor(1000 / targetedFps);
        let frameId = 0;

        let interval = setInterval(() => {

          unlink('./out/frame.jpeg')
            .catch((e) => {
              if (e.errno === -2) {
                console.log('frame.jpeg does not exist, but it\'s okay buddy');
                return Promise.resolve();
              }
            })
            .then(() => {
              console.log('Capturing frame');
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
            .catch((e) => { console.log(e) })
        }, rate);

        setTimeout(() => {
          resolve();
        }, duration)
      } catch (e) {
        reject(e);
      }
    }, delay);
  });

  return promise;
}

function CaptureScreenshot(Page) {
  let promise = new Promise((resolve, reject) => {

    // we wait for the video to be started
    setTimeout(() => {
      Page.captureScreenshot({
        format: "jpeg",
        fromSurface: true
      })
        .then((frame) => {
          fs.writeFile(`./out/screenshot.jpeg`, Buffer.from(frame.data, 'base64'), (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        })
        .catch(e => reject(e));
    }, 1000);
  });

  return promise;
}

module.exports = {
  StartScreencast,
  StartCheapScreencast,
  CaptureScreenshot
};
