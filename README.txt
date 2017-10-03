## Overview

EMS Web Services are a suite of scripts hosted on a node server that leverage the EMS's Event Notification System and Runtime-APIs. The EMS Web Services provide a convenient way to extend and customize the EMS for your projects and environments.

This document is written for users of the EMS Web Services. It is expected that you have a basic understanding of multimedia streaming and the technologies required to perform multimedia streaming.

 

## Getting Started

### Pre-requisites

Before you begin, you should make sure you have installed all these prerequisites on your development machine.

1. **EMS** - Make sure you have Evostream Media Server installed in your system. Download here: <https://evostream.com/software-downloads/>
2. **Node.js & npm** - Download & Install Node.js and the npm package manager

 

### Installation

#### Windows Installation

Note: Make sure that you have the Node.js for Windows installed on your system.

1. **Download** the evowebservices Windows batch file installer from our Github
   
   Link: <https://github.com/EvoStream/evowebservices-archives/tree/master/installers>
   
2. Double click on the .bat file to **install** evowebservices
   
   ``` 
   evowebservices-0.0.1-win-x64.bat
   ```
   
3. If the installation is successful, evowebservices will start automatically
   
   ``` 
   starting evowebservices using npm....
   
   > evowebservices@0.0.0 start C:\node_evowebservices\node_modules\evowebservices
   > node ./bin/www
   
   STARTED: evowebservices:server Listening on port 4000
   info: STARTED: evowebservices:server Listening on port 4000
   info: Get enabled Plugins
   ```



####  Linux Installation

1.  **Download** the evowebservices Bash Script file installer from our Github.
   
   Link: <https://github.com/EvoStream/evowebservices-archives/tree/master/installers>
   
2. Locate the installer file, **install** the script by typing this in terminal:
   
   ``` 
   ./evowebservices-0.0.1-linux-x64.sh
   ```
   
3. If the installation is successful, evowebservices will start automatically
   
   ``` 
   Starting EVOWEBSERVICES...
   
   > evowebservices@0.0.0 start /home/user/Desktop/node_modules/evowebservices
   > node ./bin/www
   
   STARTED: evowebservices:server Listening on port 4000 
   info: STARTED: evowebservices:server Listening on port 4000 
   info: Get enabled Plugins
   ```



#### Distribution Content

``` 
/ node_evowebservices
├── node_modules
│   └── evowebservices
│       ├── base_plugins
│ 		│ 	├── basehdsplugin.js
│ 		│ 	├── basehlsplugin.js
│ 		│ 	└── baseplugin.js
│       ├── bin
│ 		│ 	└── www
│       ├── config
│ 		│ 	├── logging.json
│ 		│ 	└── plugins.json
│       ├── core_modules
│ 		│ 	└── ems-api-core.js
│       ├── logs
│ 		│ 	└── evowebservices.log
│       ├── node_modules
│ 		│ 	├── body-parser
│ 		│ 	├── comment-json
│ 		│ 	├── concat-stream
│ 		│ 	├── debug
│ 		│ 	├── express
│ 		│ 	├── morgan
│ 		│ 	├── request-enhanced
│ 		│ 	├── s3
│ 		│ 	└── winston
│       ├── plugins
│ 		│ 	├── amazondashupload.js
│ 		│ 	├── amazonhdsupload.js
│ 		│ 	├── amazonhlsupload.js
│ 		│ 	├── streamautorouter.js
│ 		│ 	├── streamloadbalancer.js
│ 		│ 	└── streamrecorder.js
│       ├── routes
│ 		│ 	├── evowebservices.js
│ 		│ 	└── index.js
│       ├── services
│ 		│ 	└── plugin-service.js
│       ├── views
│ 		│ 	├── error.hbs
│ 		│ 	├── index.hbs
│ 		│ 	└── layout.hbs
│       ├── app.js
│       ├── LICENSE
│       ├── package.json
└──     └── README.txt

```



**Note:** **All plugins are disabled**. Stop the evowebservices then configure the plugins to be used. Start the evowebervices by calling `npm start` in terminal.



Please refer to the link for more information:

<http://docs.evostream.com/ems_web_services_user_guide/table_of_contents> 





## Plugin Descriptions

- **Stream AutoRouting**

​	Automatically forwards a stream to another EMS via RTMP.

- **Stream Recorder**

​	Automatically records streams that enters EMS.

- **Stream Load Balancer**

​	Ensures that a group of EMS instances maintain the same collection of inbound (source) streams.

- **Amazon S3 HLS Upload**

​	Automatically uploads an HLS stream to an Amazon S3 storage instance.

- **Amazon S3 HDS Upload**

​	Automatically uploads an HDS stream to an Amazon S3 storage instance.

- **Amazon S3 DASH Upload**

​	Automatically uploads an DASH stream to an Amazon S3 storage instance.



See <http://docs.evostream.com/ems_web_services_user_guide/ems_web_services_plugins> for more information.



## Configuration

The evowebservices configurations are found on the `/evowebservices/config` directory:

- **plugins.json**

​	This is the configuration to enable plugins and set the configuration for each plugin.

- **Log Files**

​	This is the configuration to enable logging of the evowebservices to a file and the console.

- **EMS Config.lua**

​	Enable the evowebservices node on the config.lua - Event Notification System

``` 
Sample Configuration in the config.lua

eventLogger=
			{
				{
					type="RPC",
					-- IMPORTANT!!!
					-- To set the url below, match the webconfig.lua's ip and port settings
					--    port=8888,
					--    bindToIP="", -- used for binding to a particular IP
					--                    used in cases where a machine has multiple ethernet interfaces
					-- If using a single ethernet interface, use the localhost ip (not loopback);
					-- otherwise, use what is defined in bindToIP
					url="http://localhost:4000/evowebservices/",
					serializerType="JSON",
					-- serializerType="XML"
					-- serializerType="XMLRPC"
					enabledEvents=
					{  --These are the events sent by default and tend to be the most commonly used
						"inStreamCreated",
						"inStreamClosed",
						"outStreamCreated",
						"timerCreated",
						"timerTriggered",
						"timerClosed",						
						"hlsMasterPlaylistUpdated",
						"hlsChildPlaylistUpdated",
						"hlsChunkClosed",
						"hdsMasterPlaylistUpdated",
						"hdsChildPlaylistUpdated",
						"hdsChunkClosed",
						"dashChunkClosed",
						"dashPlaylistUpdated"													
					},
				},
			}
``` 

## Running the evowebservices 

1.  Run the EMS with the evowebservices configured on the event notification system in the config.lua

2.  Open your node command prompt and go to your evowebservices directory.Start the evowebservices and execute command:
Send the following command in the terminal:

``` 
npm start
```

3. Check the node console terminal and evowebservice log for errors. The evowebservices log is located on the evowebservices/logs directory


## Stopping the evowebservices 

If you wish to stop running the evowebservices, execute **CRTL+C** command in the console where the evowebservices is running:

``` 
Terminate batch job (Y/N)?
```

Type **Y** and press **Enter**. The terminal will now close and running services will stop.

**Note:** Sending CRTL+C in Linux will automatically stop the evowebservices.



## License

**(The MIT License)**

 

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.