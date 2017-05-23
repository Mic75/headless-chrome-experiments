const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const debug = require('debug')('server');
const chromeCapture = require('./chrome-capture');

app.use(bodyParser.text());

module.exports = {
  init(){
    debug('Start web server on port 3000');

    // POST method route
    app.post('/', function (req, res) {
      debug('POST received');
      debug(`Body: ${req.body}`);
      chromeCapture.evaluate(req.body);
      // chromeCapture.singleshot();
      res.send('yeah baby !')
    });

    app.listen(3000)
  }
};



