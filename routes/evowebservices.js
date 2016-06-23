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

console.log("evowebservices:server Listening on port 4000 ");

var winston = require('winston');

var jsonComment = require('comment-json');
var fs = require('fs');
var configLog = jsonComment.parse(fs.readFileSync("./config/logging.json"), null, true);

// set winston log
winston.add(winston.transports.File, {
    level: configLog.options.level,
    filename: configLog.options.filename,
    handleExceptions: configLog.options.handleExceptions,
    json: configLog.options.json,
    level: configLog.options.level,
    maxsize: configLog.options.maxsize
}); 
winston.remove(winston.transports.Console);

//load the service that initializes the plugins 
var pluginService = require('../services/plugin-service');
//load Enabled Plugins
var pluginStack = pluginService.getPluginsStack();

router.post('/', function(req, res, next) {
    winston.log("info", "EVOWEBSERVICES EVOWEBSERVICES RAW POST from EMS");    

    //Get the RAW POST DATA
    var event = req.body;
    var eventType = req.body.type

    winston.log("verbose", "event " + JSON.stringify(event));
    winston.log("info", "eventType " + eventType);

    //Added the remoteIp
    var remoteIp = req.ip.split(":").pop();
    event.remoteIp = remoteIp;

    winston.log("verbose", "remoteIp " + remoteIp);

    var eventSupported = false;
    var processEventStatus = false;

    for (var plugin in pluginStack) {

        winston.log("verbose", "plugin " + plugin);

        eventSupported = pluginStack[plugin].supportsEvent(eventType);

        if (eventSupported == true) {
            winston.log("verbose", "eventSupported " + eventSupported);

            processEventStatus = pluginStack[plugin].processEvent(event);

            if (processEventStatus == false) {
                winston.log("error", "Plugin: " + plugin + "failed ");
            }
        }
    }

});

module.exports = router;