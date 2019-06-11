#! /usr/bin/env node
var exec = require('child_process').exec;
var argv = require('yargs').argv;
var bunderConfig = argv.config;
var dest = argv.dest;
var bundlerName = argv.name;
var bundleSource = argv.source;
var gulpfilePath = __dirname + "/gulpfile.js";

var child = exec('gulp build --gulpfile ' + gulpfilePath + ' --name ' + bundlerName + ' --config "' + bunderConfig + '"' + ' --dest ' + dest + ' --source ' + bundleSource, function (err, stdout, stderr) {
    console.log(stdout);
});



