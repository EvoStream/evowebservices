/***
 * 
 * EvoStream Web Services
 * EvoStream, Inc.
 * (c) 2016 by EvoStream, Inc. (support@evostream.com)
 * Released under the MIT License
 * 
 ***/

var express = require('express');
var router = express.Router();

console.log("STARTED: evowebservices:server Listening on port 4000 ");

var winston = require('winston');

var jsonComment = require('comment-json');
var fs = require('fs');
var configLog = jsonComment.parse(fs.readFileSync("./config/logging.json"), null, true);

winston.addColors({
  silly: 'blue',
  debug: 'gray',
  verbose: 'magenta',
  info: 'green',
  warn: 'yellow',
  error: 'red'
});

winston.remove(winston.transports.Console);

// set winston log
winston.add(winston.transports.File, {
  level: configLog.options.level,
  filename: "./logs/evowebservices." + process.pid + "." + new Date().getTime() + "-" + ".log",
  handleExceptions: configLog.options.handleExceptions,
  json: configLog.options.json,
  maxsize: configLog.options.maxsize
});

winston.add(winston.transports.Console, {
  level: configLog.options.level,
  handleExceptions: configLog.options.handleExceptions,
  colorize: true
});


winston.log("info", "STARTED: evowebservices:server Listening on port 4000 ");

//load the service that initializes the plugins 
var pluginService = require('../services/plugin-service');
//load Enabled Plugins
var pluginStack = pluginService.getPluginsStack();

router.post('/', function(req, res, next) {
  winston.log("info", "evowebservices:server RAW POST DATA from EMS");

  //Get the RAW POST DATA
  var event = req.body;
  var eventType = req.body.type

  winston.log("verbose", "event: " + JSON.stringify(event));
  winston.log("info", "eventType: " + eventType);

  var eventSupported = false;
  var processEventStatus = false;
  var remoteIp = null;

  //Added the remoteIp
  if (event.payload.ip == "") {
    remoteIp = req.ip.split(":").pop();
  } else {
    remoteIp = event.payload.ip;
  }
  event.remoteIp = remoteIp;

  var remoteIp = event.payload.ip;
  event.remoteIp = remoteIp;

  winston.log("verbose", "remoteIp: " + remoteIp);


  for (var plugin in pluginStack) {

    winston.log("info", "plugin: " + plugin);

    eventSupported = pluginStack[plugin].supportsEvent(eventType);

    if (eventSupported == true) {
      winston.log("verbose", "eventSupported: " + eventSupported);

      processEventStatus = pluginStack[plugin].processEvent(event);

      if (processEventStatus == false) {
        winston.log("error", "Plugin: " + plugin + "failed ");
      }
    }
  }

});

module.exports = router;