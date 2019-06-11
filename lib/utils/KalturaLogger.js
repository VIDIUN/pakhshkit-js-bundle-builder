const os = require('os');
const fs = require('fs');
const util = require('util');
const config = require('config');
const uidGenerator = require('uuid/v4');
const VidiunRequestUtils = require('./RequestUtils.js');

VidiunLogger = {
    config: null,
    hostname: os.hostname(),
    debugEnabled: false,
    accessLogFile: null,
    logFile: null,
    errorFile: null,

    accessRequestHeaders: ['referrer', 'user-agent', 'x-vidiun-f5-https', 'host', 'x-forwarded-for', 'x-forwarded-server', 'x-forwarded-host'],
    accessResponseHeaders: ['content-range', 'cache-control', 'x-vidiun-session'],

    init: function(){
        if(!config.has('logger') || VidiunLogger.config)
            return;

        VidiunLogger.config = config.get('logger');

        if(VidiunLogger.config.debugEnabled){
            VidiunLogger.debugEnabled = parseInt(VidiunLogger.config.debugEnabled);
        }
        if(VidiunLogger.config.accessRequestHeaders){
            VidiunLogger.accessRequestHeaders = VidiunLogger.config.accessRequestHeaders.split(',');
        }
        if(VidiunLogger.config.accessResponseHeaders){
            VidiunLogger.accessResponseHeaders = VidiunLogger.config.accessResponseHeaders.split(',');
        }

        if(VidiunLogger.config.accessLogName){
            VidiunLogger.accessLogFile = fs.openSync(VidiunLogger.config.logDir + '/' + VidiunLogger.config.accessLogName, 'a');
        }

        if(VidiunLogger.config.logName){
            VidiunLogger.logFile = fs.openSync(VidiunLogger.config.logDir + '/' + VidiunLogger.config.logName, 'a');
        }

        if(VidiunLogger.config.errorLogName){
            VidiunLogger.errorFile = fs.openSync(VidiunLogger.config.logDir + '/' + VidiunLogger.config.errorLogName, 'a');
        }
    },

    notifyLogsRotate: function(){
        if(VidiunLogger.config.accessLogName){
            var newAccessLogHandler = fs.openSync(VidiunLogger.config.logDir + '/' + VidiunLogger.config.accessLogName, 'a');
            var oldAccessLogHandler = VidiunLogger.accessLogFile;
            VidiunLogger.accessLogFile = newAccessLogHandler;
            fs.closeSync(oldAccessLogHandler);
        }
        if(VidiunLogger.config.logName){
            var newLogHandler = fs.openSync(VidiunLogger.config.logDir + '/' + VidiunLogger.config.logName, 'a');
            var oldLogHandler = VidiunLogger.logFile;
            VidiunLogger.logFile = newLogHandler;
            fs.closeSync(oldLogHandler);
        }
        if(VidiunLogger.config.errorLogName){
            var newErrorLogHandler = fs.openSync(VidiunLogger.config.logDir + '/' + VidiunLogger.config.errorLogName, 'a');
            var oldErrorLogHandler = VidiunLogger.errorFile;
            VidiunLogger.errorFile = newErrorLogHandler;
            fs.closeSync(oldErrorLogHandler);
        }
    },

    getDateTime: function () {
        var date = new Date();

        var hour = date.getHours();
        hour = (hour < 10 ? "0" : "") + hour;

        var min  = date.getMinutes();
        min = (min < 10 ? "0" : "") + min;

        var sec  = date.getSeconds();
        sec = (sec < 10 ? "0" : "") + sec;

        var year = date.getFullYear();

        var month = date.getMonth() + 1;
        month = (month < 10 ? "0" : "") + month;

        var day  = date.getDate();
        day = (day < 10 ? "0" : "") + day;

        return year + "/" + month + "/" + day + " " + hour + ":" + min + ":" + sec;
    },

    prefix: function(stackSource){
        var time = VidiunLogger.getDateTime();

        if(!stackSource)
            stackSource = new Error();
        var stack = stackSource.stack.split('\n');
        var stackLevel = 3;
        var line = stack[stackLevel].trim().split(' ');
        line = line[1];
        if(line.indexOf('/') > 0)
            line = line.substr(line.lastIndexOf('/') + 1);
        else if(line.indexOf('\\') > 0)
            line = line.substr(line.lastIndexOf('\\') + 1);

        return '[' + process.pid + '][' + time + '][' + line + ']';
    },

    write: function(str){
        if(VidiunLogger.logFile){
            fs.writeSync(VidiunLogger.logFile, str + '\n');
        }
        else{
            console.log(str);
        }
    },

    writeError: function(str){
        this.write(str);
        if(VidiunLogger.errorFile){
            fs.writeSync(VidiunLogger.errorFile, str + '\n');
        }
        else{
            console.error(str);
        }
    },

    debug: function(str, stackSource){
        if(VidiunLogger.debugEnabled){
            VidiunLogger.write(VidiunLogger.prefix(stackSource) + ' DEBUG: ' + str);
        }
    },

    log: function(str, stackSource){
        VidiunLogger.write(VidiunLogger.prefix(stackSource) + ' INFO: ' + str);
    },

    warn: function(str, stackSource){
        VidiunLogger.writeError(VidiunLogger.prefix(stackSource) + ' WARN: ' + str);
    },

    error: function(str, stackSource){
        VidiunLogger.writeError(VidiunLogger.prefix(stackSource) + ' ERROR: ' + str);
    },

    dir: function(object, stackSource, prefix){
        VidiunLogger.write(VidiunLogger.prefix(stackSource) + ' INFO: ' + (prefix ? prefix : '') + util.inspect(object, { showHidden: true, depth: null }));
    },

    quoteVar: function(val) {
        if (!val) {
            return '-';
        }

        return '"' + val + '"';
    },

    _generateSessionId: function(){
        return uidGenerator();
    },

    access: function(request, response){
        var startTime = new Date().getTime();
        response.sessionId = this._generateSessionId();
        request.sessionId = response.sessionId;

        var timeout = setTimeout(function(){
            response.writeHead(408, {
                'Content-Type' : 'text/plain',
                'Access-Control-Allow-Origin' : '*'
            });
            response.end('Request Timeout!');
        }, config.get('cloud.requestTimeout') * 1000);

        var getStack = function(){
            return new Error();
        };

        request.log = function(msg){
            VidiunLogger.log('Request [' + request.sessionId + '] ' + msg, getStack());
        };
        request.dir = function(object){
            VidiunLogger.dir(object, getStack(), 'Request [' + request.sessionId + '] ');
        };
        request.error = function(msg){
            VidiunLogger.error('Request [' + request.sessionId + '] ' + msg, getStack());
        };
        request.debug = function(msg){
            VidiunLogger.debug('Request [' + request.sessionId + '] ' + msg, getStack());
        };

        request.remoteIp = VidiunRequestUtils.getRemoteIpAddress(request);
        request.log("Remote IP for incoming request is [" + request.remoteIp + "]");

        var savedHeaders = {};
        var responseWriteHead = response.writeHead;
        response.writeHead = function (statusCode, reasonPhrase, headers) {
            for (var i = 0; i < VidiunLogger.accessResponseHeaders.length; i++) {
                var curHeader = VidiunLogger.accessResponseHeaders[i];
                savedHeaders[curHeader] = response.getHeader(curHeader);
                if (headers && headers[curHeader])
                    savedHeaders[curHeader] = headers[curHeader];
            }

            // call the original
            responseWriteHead.apply(response, [statusCode, reasonPhrase, headers]);
        };

        var responseEnd = response.end;
        response.end = function(body){
            clearTimeout(timeout);
            var executionTime = (new Date().getTime()) - startTime;
            var logLine = request.remoteIp + ' ' + VidiunLogger.getDateTime() + ' "' + request.method + ' ' + request.url + ' HTTP/' + request.httpVersion + '" ' + response.statusCode;
            logLine += ' ' + Math.floor(executionTime / 1000) + '/' + (executionTime * 1000);

            // add the request headers
            for (var i = 0; i < VidiunLogger.accessRequestHeaders.length; i++) {
                var curHeader = VidiunLogger.accessRequestHeaders[i];
                logLine += ' ' + VidiunLogger.quoteVar(request.headers[curHeader]);
            }

            // add the response headers
            for (var i = 0; i < VidiunLogger.accessResponseHeaders.length; i++) {
                var curHeader = VidiunLogger.accessResponseHeaders[i];
                if (!savedHeaders[curHeader] && response.getHeader(curHeader))
                    logLine += ' ' + VidiunLogger.quoteVar(response.getHeader(curHeader));
                else
                    logLine += ' ' + VidiunLogger.quoteVar(savedHeaders[curHeader]);
            }

            if(VidiunLogger.accessLogFile){
                fs.writeSync(VidiunLogger.accessLogFile, logLine + '\n');
            }

            responseEnd.apply(response, [body]);
        };

        VidiunLogger.setVidiunResponseHeaders(response);
    },

    setVidiunResponseHeaders(response) {
        response.setHeader("X-Me", VidiunLogger.hostname);
        response.setHeader("X-Vidiun-Session", response.sessionId);
        response.setHeader("Access-Control-Allow-Origin", "*");
    },

    setRequestSessionId: function(request, sessionId) {
        request.log("Updating session id from [" + request.sessionId + "] to [" + sessionId + "]");
        request.sessionId = sessionId;
    }
};

VidiunLogger.init();
