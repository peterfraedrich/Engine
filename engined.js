//// SCOUT API ///////////////////////////////////////////

////////////////////////////////////////////////////////// DEPS
var application_root = __dirname,
    express = require('express'),
    serveStatic = require('serve-static')
    exec = require('child_process').exec,
    methodOverride = require('method-override'),
    errorhandler = require('errorhandler'),
    bodyParser = require('body-parser')
    path = require('path'),
    sys = require('sys'),
    ini = require('ini'),
    fs = require('fs'),

////////////////////////////////////////////////////////// CLASS INSTANTIATION & VARS
var app = express();
var config = ini.parse(fs.readFileSync('engine.conf', 'utf-8'))


////////////////////////////////////////////////////////// ALLOW XSS / CORS
var allowCrossDomain = function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header('Access-Control-Allow-Methods', '*');
      res.header('Access-Control-Allow-Headers', '*');
      res.header('Access-Control-Allow-Headers', 'X-Requested-With, Accept, Origin, Referer, User-Agent, Content-Type, Authorization');

      // intercept OPTIONS method
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      }
      else {
        next();
      }
    };

    app.use(allowCrossDomain);   // make sure this is is called before the router
    app.use(bodyParser());
    app.use(methodOverride());
    app.use(errorhandler());
    app.use(express.static(path.join(application_root, "public")));
