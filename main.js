require('./lib/utils/KalturaLogger');
const BundleBuilder = require('./lib/BundleBuilderApi');
const continuationLocalStorage = require('continuation-local-storage');

function KalturaMainProcess(){
    this.start();
};

KalturaMainProcess.prototype.start = function () {

    this.namespace = continuationLocalStorage.createNamespace('bundle-builder-server');//Here just to make sure we create it only once
    var server = new BundleBuilder();

    process.on('SIGUSR1', function() {
        KalturaLogger.log('Got SIGUSR1. Invoke log rotate notification.');
        KalturaLogger.notifyLogsRotate();
    });

};

module.exports.KalturaMainProcess = KalturaMainProcess;

var KalturaProcess = new KalturaMainProcess();
