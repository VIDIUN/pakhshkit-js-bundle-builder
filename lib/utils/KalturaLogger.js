const os = require('os');
const fs = require('fs');
const util = require('util');
const config = require('config');
const uidGenerator = require('uuid/v4');
const KalturaRequestUtils = require('./RequestUtils.js');

KalturaLogger = {
    config: null,
    hostname: os.hostname(),
    debugEnabled: false,
    accessLogFile: null,
    logFile: null,
    errorFile: null,

    accessRequestHeaders: ['referrer', 'user-agent', 'x-kaltura-f5-https', 'host', 'x-forwarded-for', 'x-forwarded-server', 'x-forwarded-host'],
    accessResponseHeaders: ['content-range', 'cache-control', 'x-kaltura-session'],

    init: function(){
        if(!config.has('logger') || KalturaLogger.config)
            return;

        KalturaLogger.config = config.get('logger');

        if(KalturaLogger.config.debugEnabled){
            KalturaLogger.debugEnabled = parseInt(KalturaLogger.config.debugEnabled);
        }
        if(KalturaLogger.config.accessRequestHeaders){
            KalturaLogger.accessRequestHeaders = KalturaLogger.config.accessRequestHeaders.split(',');
        }
        if(KalturaLogger.config.accessResponseHeaders){
            KalturaLogger.accessResponseHeaders = KalturaLogger.config.accessResponseHeaders.split(',');
        }

        if(KalturaLogger.config.accessLogName){
            KalturaLogger.accessLogFile = fs.openSync(KalturaLogger.config.logDir + '/' + KalturaLogger.config.accessLogName, 'a');
        }

        if(KalturaLogger.config.logName){
            KalturaLogger.logFile = fs.openSync(KalturaLogger.config.logDir + '/' + KalturaLogger.config.logName, 'a');
        }

        if(KalturaLogger.config.errorLogName){
            KalturaLogger.errorFile = fs.openSync(KalturaLogger.config.logDir + '/' + KalturaLogger.config.errorLogName, 'a');
        }
    },

    notifyLogsRotate: function(){
        if(KalturaLogger.config.accessLogName){
            var newAccessLogHandler = fs.openSync(KalturaLogger.config.logDir + '/' + KalturaLogger.config.accessLogName, 'a');
            var oldAccessLogHandler = KalturaLogger.accessLogFile;
            KalturaLogger.accessLogFile = newAccessLogHandler;
            fs.closeSync(oldAccessLogHandler);
        }
        if(KalturaLogger.config.logName){
            var newLogHandler = fs.openSync(KalturaLogger.config.logDir + '/' + KalturaLogger.config.logName, 'a');
            var oldLogHandler = KalturaLogger.logFile;
            KalturaLogger.logFile = newLogHandler;
            fs.closeSync(oldLogHandler);
        }
        if(KalturaLogger.config.errorLogName){
            var newErrorLogHandler = fs.openSync(KalturaLogger.config.logDir + '/' + KalturaLogger.config.errorLogName, 'a');
            var oldErrorLogHandler = KalturaLogger.errorFile;
            KalturaLogger.errorFile = newErrorLogHandler;
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
        var time = KalturaLogger.getDateTime();

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
        if(KalturaLogger.logFile){
            fs.writeSync(KalturaLogger.logFile, str + '\n');
        }
        else{
            console.log(str);
        }
    },

    writeError: function(str){
        this.write(str);
        if(KalturaLogger.errorFile){
            fs.writeSync(KalturaLogger.errorFile, str + '\n');
        }
        else{
            console.error(str);
        }
    },

    debug: function(str, stackSource){
        if(KalturaLogger.debugEnabled){
            KalturaLogger.write(KalturaLogger.prefix(stackSource) + ' DEBUG: ' + str);
        }
    },

    log: function(str, stackSource){
        KalturaLogger.write(KalturaLogger.prefix(stackSource) + ' INFO: ' + str);
    },

    warn: function(str, stackSource){
        KalturaLogger.writeError(KalturaLogger.prefix(stackSource) + ' WARN: ' + str);
    },

    error: function(str, stackSource){
        KalturaLogger.writeError(KalturaLogger.prefix(stackSource) + ' ERROR: ' + str);
    },

    dir: function(object, stackSource, prefix){
        KalturaLogger.write(KalturaLogger.prefix(stackSource) + ' INFO: ' + (prefix ? prefix : '') + util.inspect(object, { showHidden: true, depth: null }));
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
            KalturaLogger.log('Request [' + request.sessionId + '] ' + msg, getStack());
        };
        request.dir = function(object){
            KalturaLogger.dir(object, getStack(), 'Request [' + request.sessionId + '] ');
        };
        request.error = function(msg){
            KalturaLogger.error('Request [' + request.sessionId + '] ' + msg, getStack());
        };
        request.debug = function(msg){
            KalturaLogger.debug('Request [' + request.sessionId + '] ' + msg, getStack());
        };

        request.remoteIp = KalturaRequestUtils.getRemoteIpAddress(request);
        request.log("Remote IP for incoming request is [" + request.remoteIp + "]");

        var savedHeaders = {};
        var responseWriteHead = response.writeHead;
        response.writeHead = function (statusCode, reasonPhrase, headers) {
            for (var i = 0; i < KalturaLogger.accessResponseHeaders.length; i++) {
                var curHeader = KalturaLogger.accessResponseHeaders[i];
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
            var logLine = request.remoteIp + ' ' + KalturaLogger.getDateTime() + ' "' + request.method + ' ' + request.url + ' HTTP/' + request.httpVersion + '" ' + response.statusCode;
            logLine += ' ' + Math.floor(executionTime / 1000) + '/' + (executionTime * 1000);

            // add the request headers
            for (var i = 0; i < KalturaLogger.accessRequestHeaders.length; i++) {
                var curHeader = KalturaLogger.accessRequestHeaders[i];
                logLine += ' ' + KalturaLogger.quoteVar(request.headers[curHeader]);
            }

            // add the response headers
            for (var i = 0; i < KalturaLogger.accessResponseHeaders.length; i++) {
                var curHeader = KalturaLogger.accessResponseHeaders[i];
                if (!savedHeaders[curHeader] && response.getHeader(curHeader))
                    logLine += ' ' + KalturaLogger.quoteVar(response.getHeader(curHeader));
                else
                    logLine += ' ' + KalturaLogger.quoteVar(savedHeaders[curHeader]);
            }

            if(KalturaLogger.accessLogFile){
                fs.writeSync(KalturaLogger.accessLogFile, logLine + '\n');
            }

            responseEnd.apply(response, [body]);
        };

        KalturaLogger.setKalturaResponseHeaders(response);
    },

    setKalturaResponseHeaders(response) {
        response.setHeader("X-Me", KalturaLogger.hostname);
        response.setHeader("X-Kaltura-Session", response.sessionId);
        response.setHeader("Access-Control-Allow-Origin", "*");
    },

    setRequestSessionId: function(request, sessionId) {
        request.log("Updating session id from [" + request.sessionId + "] to [" + sessionId + "]");
        request.sessionId = sessionId;
    }
};

KalturaLogger.init();
