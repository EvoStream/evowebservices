/***
 * 
 * EvoStream Web Services
 * EvoStream, Inc.
 * (c) 2016 by EvoStream, Inc. (support@evostream.com)
 * Released under the MIT License
 * 
 ***/

var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var concat = require('concat-stream');

var routes = require('./routes/index');
// var users = require('./routes/users');
var evowebservices = require('./routes/evowebservices');

var app = express();

//Set winston
var winston = require('winston');

var jsonComment = require('comment-json');
var fs = require('fs');

var path = require('path');
var fileLogging = path.join(__dirname, '/config/logging.json');

var configLog = jsonComment.parse(fs.readFileSync(fileLogging), null, true);

winston.addColors({
    silly: 'blue',
    debug: 'gray',
    verbose: 'magenta',
    info: 'green',
    warn: 'yellow',
    error: 'red'
});

winston.remove(winston.transports.Console);

var logFileName = path.join(__dirname, '/logs/evowebservices.') + process.pid + "." + new Date().getTime() + "-" + ".log";

// set winston log
winston.add(winston.transports.File, {
    level: configLog.options.level,
    filename: logFileName,
    handleExceptions: configLog.options.handleExceptions,
    json: configLog.options.json,
    maxsize: configLog.options.maxsize,
    timestamp: function () {

        var d = new Date();
        var dISO = d.toISOString();

        var timestamp = dISO + " - " + process.pid;

        return timestamp;
    }
});

winston.add(winston.transports.Console, {
    level: configLog.options.level,
    handleExceptions: configLog.options.handleExceptions,
    colorize: true
});

winston.stream = {
    write: function(message, encoding){ 
        winston.info("[evowebservices] "+message.trim());
    }
};

app.use(require("morgan")("combined", { "stream": winston.stream }));

process.on('uncaughtException', function(err) {
    console.log( " UNCAUGHT EXCEPTION " );
    console.log( "[Inside 'uncaughtException' event] " + err.stack || err.message );
    winston.log("error"," UNCAUGHT EXCEPTION " );
    winston.log("error","[Inside 'uncaughtException' event] " + err.stack || err.message );
});

//set to a different port
app.set('port', process.env.PORT || 4000);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
// app.use('/users', users); 
app.use('/evowebservices', evowebservices);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    //removing render view
    // res.render('error', {
    //   message: err.message,
    //   error: err
    // });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  //removing render view
  // res.render('error', {
  //   message: err.message,
  //   error: {}
  // });
});

app.use(function(request, response, next){
    //concat the stream of response from ems
    request.pipe(concat(function(data){
        request.body = data;
        next();
    }));
});

console.log("[webservices] starting app ");
winston.log("verbose", "[webservices] starting app ");

module.exports = app;
