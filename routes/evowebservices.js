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
var async = require("async");
var winston = require('winston');

var path = require('path');
var filePluginService = path.join(__dirname, '../services/plugin-service');

//load the service that initializes the plugins
// var pluginService = require('../services/plugin-service');
var pluginService = require(filePluginService);
//load Enabled Plugins
var pluginStack = pluginService.getPluginsStack();

router.get('/', function (req, res, next) {

    res.send('EVOWEBSERVICES ROUTES');

});

router.post('/', function (req, res, next) {
    winston.log("info", "[webservices] post data request triggered");

    //Get the RAW POST DATA
    var event = req.body;
    var eventType = req.body.type;

    winston.log("verbose", "[webservices] event: " + JSON.stringify(event));
    winston.log("info", "[webservices] eventType: " + eventType);

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

            if (processEventStatus == false)  {
                winston.log("error", "[webservices] Plugin: " + plugin + " failed ");
            }
        }
    }

});

module.exports = router;