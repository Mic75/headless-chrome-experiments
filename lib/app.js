const chromeCapture = require('./chrome-capture');
const server = require('./server');

module.exports = {
  init(){
    chromeCapture.init();
    server.init();
  }
};
