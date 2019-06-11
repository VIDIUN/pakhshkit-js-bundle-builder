require('./utils/VidiunLogger');
require('./utils/BundleBuilderServerErrors');
const url = require('url');
const os = require('os');
const config = require('config');
const util = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const exec = require('child_process').exec;
const gulpfilePath = __dirname + "/../gulpfile.js";

class BundleBuilderApi {

    constructor() {

        try {
            this._version = config.get('server.version');
            this._startServer();
        }
        catch (err) {
            VidiunLogger.error("EXITING: " + BundleBuilderServerErrors.ASYNC_PROXY_SERVER_INIT_ERROR + ": " + util.inspect(err));
            process.exit(1);

        }
    }

    _startServer() {

        VidiunLogger.log('\n\n_____________________________________________________________________________________________');
        VidiunLogger.log('Bundle-Builder-Server ' + this._version + ' started');

        if (config.has('cloud.httpPort')) {
            this.httpApp = this._startHttpServer();
            this._configureBundnleBuilderServer(this.httpApp);
        }

        if (config.has('cloud.httpsPort')) {
            this.httpsApp = this._startHttpsServer();
            this._configureBundnleBuilderServer(this.httpsApp);
        }
    }

    _startHttpServer() {
        const httpPort = config.get('cloud.httpPort');
        VidiunLogger.log(`Listening on port [${httpPort}]`);
        const app = express();
        app.listen(httpPort);
        return app;
    }

    _startHttpsServer() {
        const httpsPort = config.get('cloud.httpsPort');
        VidiunLogger.log(`Listening on port [${httpsPort}]`);
        const app = express();
        app.listen(httpsPort);
        return app;
    }

    _clock(start) {
        if ( !start ) return process.hrtime();
        var end = process.hrtime(start);
        return Math.round((end[0]*1000) + (end[1]/1000000));
    }

    _configureBundnleBuilderServer(app) {

        const This = this;
        app.use(
            function (req, res, next) {
                VidiunLogger.access(req, res);
                next();
            });

        app.use(bodyParser.urlencoded({
            extended: true,
            verify: function (req, res, body) {
                req.rawBody = body.toString();
            }
        }));

        app.use(bodyParser.json({
            type: "application/json",
            verify: function (req, res, body) {
                req.rawBody = JSON.parse(body.toString());
            }

        }));

        app.get('/admin/alive/',
            function (request, response) {
                response.end("Vidiun");
            });

        app.get('/version',
            function (request, response) {
                response.end(This._version + "\n");
            }
        );

        app.get('/build',
            function (request, response) {
                var bunderConfig = request.query.config;
                var bundlerName = request.query.name;
                var dest = request.query.dest;
                var bundleSource = request.query.source;
                var startTime = This._clock();
                VidiunLogger.log("Bundle id: " + bundlerName + "\ndest: " + dest + "\nconfig: " + bunderConfig);
                var child = exec('gulp build --silent --gulpfile ' + gulpfilePath + ' --name ' + bundlerName + ' --config "' + bunderConfig + '"' + ' --dest ' + dest + ' --source ' + bundleSource, {maxBuffer: 1024 * 1000000000}, function (err, stdout, stderr) {
                    var elapsedTime = This._clock(startTime);
                    if (err) {
                        VidiunLogger.log("Bundle id: " + bundlerName + " - build error!!!\nerr: " + err + "\nelapsed time: " + elapsedTime + "ms");
                        response.status(500).end(err);
                    } else {
                        VidiunLogger.log("Bundle id: " + bundlerName + " - build success!!!\nelapsed time: " + elapsedTime + "ms");
                        response.setHeader('Content-Type', 'application/json');
                        var dataIndex = stdout.indexOf("data");
                        var dataToReturn = stdout.substring(dataIndex, stdout.length);
                        response.status(200).end(dataToReturn);
                    }
                });
            });

        app.post('/build',
            function (request, response) {
                var bunderConfig = request.rawBody.config;
                bunderConfig = JSON.stringify(bunderConfig).replace(/"/g, "'");
                bunderConfig = new Buffer(bunderConfig).toString('base64');
                var bundlerName = request.rawBody.name;
                var dest = new Buffer(request.rawBody.dest).toString('base64');
                var bundleSource = Buffer(request.rawBody.source).toString('base64');

                var child = exec('gulp build --gulpfile ' + gulpfilePath + ' --name ' + bundlerName + ' --config "' + bunderConfig + '"' + ' --dest ' + dest + ' --source ' + bundleSource, {maxBuffer: 1024 * 1000000000}, function (err, stdout, stderr) {
                        if (err) {
                            response.status(500).end(err);
                        }
                        else {
                            response.setHeader('Content-Type', 'application/json');
                            var dataIndex = stdout.indexOf("data")
                            var dataToReturn = stdout.substring(dataIndex, stdout.length)
                            response.status(200).end(dataToReturn);
                        }
                    }
                );
            });
    }
}

module.exports = BundleBuilderApi;
