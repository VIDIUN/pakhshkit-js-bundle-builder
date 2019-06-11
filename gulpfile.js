#! /usr/bin/env node
const gulp = require('gulp');
const gulpif = require('gulp-if');
const concat = require('gulp-concat');
const header = require('gulp-header');
const order = require("gulp-order");
const sourcemaps = require('gulp-sourcemaps');
const argv = require('yargs')
    .default('dest', "")
    .argv;

var bundleConfig = new Buffer(argv.config, 'base64').toString('ascii');
var saveToDest = false;
var jsDest = "";
if (argv.dest && argv.dest !== "undefined" && argv.dest !== true) {
    saveToDest = true;
    jsDest = new Buffer(argv.dest, 'base64').toString('ascii');
}

var bundlerName = argv.name;
var sourceRoot = new Buffer(argv.source, 'base64').toString('ascii');
var packageConfig = JSON.parse(bundleConfig.replace(/'/g, '"'));
var data = {
    sourceMap: "",
    bundle: ""
};
var dataIndex = 0;
gulp.task('build', function () {
    var config = packageConfig;
    var params = getParams(config);
    var stream = gulp.src(params.files)
        .pipe(order([
            sourceRoot + "/vidiunPlayer/**/*.js",
            sourceRoot + "/**/*.js"
        ], {base: './'}))
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(concat(bundlerName + '.min.js'))
        .pipe(header(params.header))
        .pipe(sourcemaps.write('.'))
        .pipe(gulpif(saveToDest, gulp.dest(jsDest)));
    stream.on('end', function () {
        console.log(JSON.stringify(data));
    });
    stream.on('data', function (chunk) {

        var contents = chunk.contents.toString().trim();
        if (dataIndex == 0)
            data.sourceMap = new Buffer(contents).toString('base64');
        else if (dataIndex == 1) {
            data.bundle = new Buffer(contents).toString('base64');
        }
        dataIndex++;
    });
    stream.on('error', function (err) {
        console.log(err)
    });

});

function getParams(config) {
    var bundlerHeader = '/**\n* Vidiun Player lib';
    var dependencies = Object.keys(config);
    var filesArray = [];
    dependencies.forEach(function (key) {
        var filePath = sourceRoot + "/" + key + "/" + config[key] + "/*.js";
        filesArray.push(filePath);
        bundlerHeader += '\n* ' + key + ' v' + config[key];
    });
    bundlerHeader += '\n*/\n';
    return {files: filesArray, header: bundlerHeader};
}









