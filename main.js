require('./lib/utils/VidiunLogger');
const BundleBuilder = require('./lib/BundleBuilderApi');
const continuationLocalStorage = require('continuation-local-storage');

function VidiunMainProcess(){
    this.start();
};

VidiunMainProcess.prototype.start = function () {

    this.namespace = continuationLocalStorage.createNamespace('bundle-builder-server');//Here just to make sure we create it only once
    var server = new BundleBuilder();

    process.on('SIGUSR1', function() {
        VidiunLogger.log('Got SIGUSR1. Invoke log rotate notification.');
        VidiunLogger.notifyLogsRotate();
    });

};

module.exports.VidiunMainProcess = VidiunMainProcess;

var VidiunProcess = new VidiunMainProcess();
