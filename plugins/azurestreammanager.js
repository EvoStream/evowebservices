/***
 *
 * EvoStream Web Services
 * EvoStream, Inc.
 * (c) 2016 by EvoStream, Inc. (support@evostream.com)
 * Released under the MIT License
 *
 ***/

var util = require('util');
var path = require('path');


//Include the Base Plugin for the application
var BasePlugin = require('../base_plugins/basesmplugin');
var winston = require('winston');

var jsonfile = require('jsonfile');
// var file = './config/plugins.json';
var file = path.join(__dirname, './config/plugins.json');

var tcpp = require('tcp-ping');

var syncFor = require('../services/syncFor');

/*
 * Azure Stream Manager Plugin
 */
var AzureStreamManager = function () {
};

//implement the BasePlugin
util.inherits(AzureStreamManager, BaseSMPlugin);

/**
 * Initialize the settings for Azure Stream Manager
 * @param array settings
 * @return boolean
 */
AzureStreamManager.prototype.init = function (settings) {

    //Apply Logs
    winston.log("info", "[evowebservices] function: AzureStreamManager initializing settings");

    this.settings = settings;

};

/**
 * Execute process for Azure Stream Manager
 * @param array event
 * @return boolean
 */
AzureStreamManager.prototype.processEvent = function (event) {

    //Apply Logs
    winston.log("info", "[evowebservices] function: AzureStreamManager process events");
    winston.log("verbose", "[evowebservices] event data: " + JSON.stringify(event));

    var azureStreamManager = this;


    if (event.type == 'vmCreated') {

        winston.log("info", '[evowebservices] AzureStreamManager vmCreated');

        //Get the serverType
        var serverType = event.payload.serverType;
        var serverObjectPort = '8888';
        var serverObjectUserName = 'evostream';

        jsonfile.readFile(file, function (err, settings) {

            winston.log("info", "[evowebservices] AzureStreamManager settings " + JSON.stringify(settings));

            if (serverType == 'edge') {

                var edgeObject = {};

                edgeObject.localIp = event.localIp;
                edgeObject.apiproxy = event.payload.apiproxy;
                edgeObject.username = serverObjectUserName;
                edgeObject.password = event.payload.password;
                edgeObject.port = serverObjectPort;

                //build the api proxy url
                edgeObject.apiproxyUrl = azureStreamManager.getUrlApiProxy(edgeObject);

                //push to settings
                settings.AzureStreamManager.parameters.edges.push(edgeObject);
                winston.log("info", "[evowebservices] list of edges " + JSON.stringify(settings.AzureStreamManager.parameters.edges));

            } else if (serverType == 'origin') {

                var originObject = {};

                originObject.localIp = event.localIp;
                originObject.apiproxy = event.payload.apiproxy;
                originObject.username = serverObjectUserName;
                ;
                originObject.port = serverObjectPort;

                //build the api proxy url
                originObject.apiproxyUrl = azureStreamManager.getUrlApiProxy(originObject);

                //push to settings
                settings.AzureStreamManager.parameters.origins.push(originObject);
                winston.log("info", "[evowebservices] list of origins " + JSON.stringify(settings.AzureStreamManager.parameters.origins));
            }

            jsonfile.writeFileSync(file, settings, {spaces: 4});
        });

    }

    if (event.type == 'inStreamCreated') {

        winston.log("info", '[evowebservices] AzureStreamManager inStreamCreated');

        var serverType = event.payload.serverType;
        var plugin = this;

        /*
         * Send Stream to Edges
         */

        //initialize the settings of the plugin
        jsonfile.readFile(file, function (err, settings) {

            winston.log("info", "[evowebservices] AzureStreamManager settings " + JSON.stringify(settings));
            winston.log("info", '[evowebservices] list of edges ' + JSON.stringify(settings.AzureStreamManager.parameters.edges));

            if(settings.AzureStreamManager.parameters.edges.length > 0){

                var edges = settings.AzureStreamManager.parameters.edges;

                syncFor(0, edges.length, "start", function (i, status, call) {

                    if (status === "done") {
                        winston.log("info", "[evowebservices] edges iteration is done");

                    } else {
                        var edgeObject = null;
                        edgeObject = edges[i];

                        winston.log("info", "[evowebservices] looping on edges ");


                        tcpp.probe(edgeObject.localIp, edgeObject.port, function (err, available) {
                            winston.log("info", "[evowebservices] edge information: "+JSON.stringify(edgeObject));
                            winston.log("info", "[evowebservices] edge ip is available " + JSON.stringify(available));

                            if (available) {
                                winston.log("info", '[evowebservices] execute pullstream on edgeObject.localIp ' + edgeObject.localIp);

                                //execute pullstream
                                //1. Get the localStreamName and List of Ip Address
                                var localStreamName = event.payload.name;
                                var remoteAddress = event.remoteIp;

                                //Get the localStreamName from previous pull
                                var _localStreamName = '';
                                if (event.payload.pullSettings != null) {
                                    _localStreamName = event.payload.pullSettings._localStreamName;
                                }

                                //Apply the logs
                                winston.log("verbose", "[evowebservices] AzureStreamManager localStreamName " + localStreamName);
                                winston.log("verbose", "[evowebservices] AzureStreamManager remoteAddress " + remoteAddress);
                                winston.log("verbose", "[evowebservices] AzureStreamManager _localStreamName " + _localStreamName);

                                //2. Check if stream was a previously processed by using property of the pull settings
                                if (_localStreamName == '' || _localStreamName != localStreamName) {

                                    if (edgeObject.localIp !== remoteAddress) {

                                        winston.log("verbose", "[evowebservices] AzureStreamManager apiproxyUrl " + edgeObject.apiproxyUrl);

                                        //execute ems version
                                        var ems = require("../core_modules/ems-api-core")(edgeObject.apiproxyUrl);

                                        var targetUri = 'rtmp://' + remoteAddress + '/live/' + localStreamName;

                                        //Apply the logs
                                        winston.log("verbose", "[evowebservices] AzureStreamManager targetUri " + targetUri);

                                        //Execute pullstream command
                                        var parameters = {
                                            uri: targetUri,
                                            localStreamName: localStreamName,
                                            keepAlive: 0
                                        };

                                        //execute pullstream
                                        ems.pullStream(parameters, function (result) {
                                            winston.log("info", "[evowebservices] AzureStreamManager pullStream status " + result.status);

                                            if (result.status == "FAIL") {
                                                winston.log("error", "[evowebservices] Error: AzureStreamManager pullStream on edge: " + JSON.stringify(edgeObject));

                                                call('next');
                                            }

                                            call('next');
                                        });
                                    }
                                }
                            }

                            call('next');
                        });
                    }
                });
            }


        });
    }


};


AzureStreamManager.prototype.getUrlApiProxy = function (serverObject) {

    winston.log("info", "[evowebservices] function: AzureStreamManager building api proxy");

    var url = '';
    url = 'http://' + serverObject['username'] + ':' + serverObject['password'] + '@' + serverObject['localIp'] + ':' + serverObject['port'] + '/' + serverObject['apiproxy'];

    return url;

}

/**
 * Check if Plugin supports the Event
 * @param string eventType
 * @return boolean
 */
AzureStreamManager.prototype.supportsEvent = function (eventType) {

    //Apply Logs
    winston.log("info", "[evowebservices] function: AzureStreamManager checking supported events");


    //Validate that Plugin supports the Event
    if (eventType == 'vmCreated') {
        return true;
    }

    //Validate that Plugin supports the Event
    if (eventType == 'inStreamCreated') {
        return true;
    }


};

module.exports = AzureStreamManager;