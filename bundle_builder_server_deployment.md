# [Bundle builder API Server](https://github.com/kaltura/playkit-js-bundle-builder) Deployment Instructions

## Machine Prerequisites
- Node 6.10.2 or above: installation reference: https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager#ubuntu-mint-elementary-os
- Node Packaged Modules (npm) 1.4.3 or above
- NVM version 0.30.1 or above

*IMPORTANT NOTE: 
The Bundle builder API Server requires [Kaltura Server](https://github.com/kaltura/server) of version Lynx-12.18.0 and above.*


## Initial Enviorment Setup
1. Clone https://github.com/kaltura/playkit-js-bundle-builder#init-bundle-builder
2. Navigate to the checkout dir
3. npm install
4. npm install -g forever
5. npm install -g gulp@3.9.1

## Configuration
1. Create a log directory (mkdir /opt/kaltura/log/BundleBuilder)
2. cp -p /opt/kaltura/playkit-js-bundle-builder/config/default.template.json /opt/kaltura/playkit-js-bundle-builder/config/default.json
4. cp -p /opt/kaltura/playkit-js-bundle-builder/bin/bundle-builder-server.template.sh /opt/kaltura/playkit-js-bundle-builder/bin/bundle-builder-server.sh

5. ln -s /opt/kaltura/playkit-js-bundle-builder/bin/bundle-builder-server.sh /etc/init.d/kaltura-bundle-builder-server
6. Replace the following tokens in default.json:
```
@LOG_DIR@ - Your logs directory
@HTTP_PORT@ - HTTP port to run the server with
@HTTPS_PORT@ - HTTPS port to run the server with
@APP_REMOTE_ADDR_HEADER_SALT@ - Should be identical to "remote_addr_header_salt" configured in you Kaltura Server configuration
```

7. Replace the following tokens in /opt/kaltura/playkit-js-bundle-builder/bin/bundle-builder-server.sh:
```
@BUNDLE_BUILDER_PREFIX@ - Bundle builder prefix
@LOG_DIR@ - Your logs directory
```

8. Start the server:
```
# /etc/init.d/kaltura-bundle-builder-server start

Make sure that tokens in /opt/kaltura/playkit-js-bundle-builder/bin/bundle-builder-server.sh file (BUNDLE_BUILDER_PATH and LOG_PATH) are pointing to the correct paths
