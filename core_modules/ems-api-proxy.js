/**
 *
 * Copyright (c) 2017, EvoStream Inc.  All rights reserved.
 *
 * This software is provided free of charge to be used solely in conjunction
 * with the EvoStream Media Server.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the source code retain the above
 * copyright notice, this list of conditions and the following disclaimer.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 *
 * @package evostream
 * @subpackage api
 * @version 0.708
 */

/**
 * EMS API PROXY
 */

var winston = require('winston');

//Build the api proxy
var fs = require("fs");
var path = require('path');
var contents = '';
var webuiDir = path.join(__dirname, "");


//check where the ems config is installed
var webconfigPath = process.argv[2];

if (typeof webconfigPath !== "undefined" ) {

    try {
        var stats = fs.statSync(webconfigPath);
        winston.log("info", "[EMS-API-PROXY]: webconfig.json exists " );
        contents = fs.readFileSync(webconfigPath);
    }
    catch (e) {
        winston.log("info", "[EMS-API-PROXY]: webconfig.json does not exists " );
        if(webuiDir.charAt(0) !== '/'){
            contents = fs.readFileSync(path.join(__dirname, "../../config/webconfig.json"));
        }else{
            contents = fs.readFileSync(path.join(__dirname, "../../../config/webconfig.json"));
        }
    }
}else{

    if(webuiDir.charAt(0) !== '/'){
        contents = fs.readFileSync(path.join(__dirname, "../../config/webconfig.json"));
    }else{
        contents = fs.readFileSync(path.join(__dirname, "../../../config/webconfig.json"));
    }
}
var webconfig = JSON.parse(contents);

var url = "http://127.0.0.1:7777";
if(webconfig.apiProxy.enable == true){
    url = 'http://' + webconfig.apiProxy.userName + ':' + webconfig.apiProxy.password + '@' + webconfig.apiProxy.address + ':' + webconfig.port + '/' + webconfig.apiProxy.pseudoDomain;
}

winston.log("info", "[EMS-API-PROXY] Is API Proxy enabled: "+webconfig.apiProxy.enable);


var emsApiProxy = {
    'url' : url,
    'webconfig' : webconfig
};


module.exports = emsApiProxy;