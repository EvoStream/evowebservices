/***
 *
 * EvoStream Web Services
 * EvoStream, Inc.
 * (c) 2016 by EvoStream, Inc. (support@evostream.com)
 * Released under the MIT License
 *
 ***/

var fs = require('fs');
var path = require('path');


var winston = require('winston');

var jsonfile = require('jsonfile');

//require configuration of plugins
var file = './config/plugins.json';
// var file = path.join(__dirname, './config/plugins.json');

var tcpp = require('tcp-ping');

var syncFor = require('../services/syncFor');

exports.cleanOfflineEdges = function () {

    winston.log("info", "Calling Function: cleanOfflineEdges ");

    /*
     * Remove Offline VM
     */
    //initialize the settings of the plugin
    jsonfile.readFile(file, function (err, settings) {
        winston.log("info", 'cleanOfflineEdges: reading settings ');

        winston.log("info", 'settings.AzureStreamManager.parameters.edges ' + JSON.stringify(settings.AzureStreamManager.parameters.edges));
        winston.log("info", 'settings.AzureStreamManager.parameters.edges.length ' +settings.AzureStreamManager.parameters.edges.length );

        if(settings.AzureStreamManager.parameters.edges.length > 0){
            var edges = settings.AzureStreamManager.parameters.edges;
            var removeIpAddresses = new Array();

            syncFor(0, edges.length, "start", function (i, status, call) {
                if (status === "done"){
                    winston.log("info", "edgeObject iteration is done");
                    winston.log("info", "edgeObject iteration removeIpAddresses " + JSON.stringify(removeIpAddresses));

                    winston.log("info", "edgeObject iteration removeIpAddresses.length " + removeIpAddresses.length);

                    //Remove Ip Address from Edge List
                    if(removeIpAddresses.length > 0){
                        for (var i in edges) {
                            for (var x in removeIpAddresses) {

                                winston.log("info", "removal iteration removeIpAddresses[x].localIp " + removeIpAddresses[x].localIp);
                                winston.log("info", "removal iteration edges[i].localIp " + edges[i].localIp);

                                if(edges[i].localIp == removeIpAddresses[x].localIp ){
                                    edges.splice(i, 1);
                                }
                            }
                        }

                        // Update Edge List
                        settings.AzureStreamManager.parameters.edges = edges;

                        winston.log("info", "REMOVED settings.AzureStreamManager.parameters.edges " + JSON.stringify(settings.AzureStreamManager.parameters.edges));

                        //Write and Save Edge List
                        jsonfile.writeFileSync(file, settings, {spaces: 4});
                    }



                } else {
                    var edgeObject = null;
                    edgeObject = edges[i];


                    winston.log("info", "looping edgeObject  " + JSON.stringify(edgeObject));

                    tcpp.probe(edgeObject.localIp, edgeObject.port, function (err, available) {
                        winston.log("info", "syncFor tcpp.probe edgeObject  " + JSON.stringify(edgeObject));
                        winston.log("info", "edgeObject ip available " + JSON.stringify(available));
                        winston.log("info", "edgeObject ip err " + JSON.stringify(err));

                        if (available == false) {
                            winston.log("info", 'removeIpAddresses edgeObject.localIp ' + edgeObject.localIp);

                            //remove ip address
                            removeIpAddresses.push(edgeObject);
                        }

                        call('next');
                    });
                }
            });
        }



    });


};
