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

console.log("[evowebservices] starting evowebservices:server listening on port 4000 ");

var winston = require('winston');

winston.log("info", "[evowebservices] starting evowebservices:server listening on port 4000 ");

var path = require('path');
var filePluginService = path.join(__dirname, '../services/plugin-service');

//load the service that initializes the plugins
var pluginService = require(filePluginService);

//load Enabled Plugins
var pluginStack = pluginService.getPluginsStack();

//load the service that cleans the edges
var fileVmService = path.join(__dirname, '../services/clean-offline-edges');
var vmService = require(fileVmService);


router.get('/', function (req, res, next) {

    var vm = {
        title: 'index'
    }

    res.render('index', vm);

});

router.post('/', function (req, res, next) {
    winston.log("info", "[evowebservices] function: Incoming raw post data from EMS");

    //clean the offline edges first
    vmService.cleanOfflineEdges();

    //Get the RAW POST DATA
    var event = req.body;
    var eventType = req.body.type;

    winston.log("info", "[evowebservices] event: "+eventType);
    winston.log("info", "[evowebservices] event data: "+ JSON.stringify(event));

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

    for (var plugin in pluginStack) {

        eventSupported = pluginStack[plugin].supportsEvent(eventType);

        if (eventSupported == true) {

            processEventStatus = pluginStack[plugin].processEvent(event);

            if (processEventStatus == false) {
                winston.log("error", "[evowebservices] plugin: " + plugin + " failed ");
            }
        }
    }

});

module.exports = router;