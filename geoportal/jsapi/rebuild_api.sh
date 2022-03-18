#!/bin/bash -e

set -x

mkdir -p /app/geoportailv3_geoportal/jsapi/build/fonts
mkdir -p /app/geoportailv3_geoportal/jsapi/webfonts
cp node_modules/font-awesome/fonts/* /app/geoportailv3_geoportal/jsapi/build/fonts/
cp node_modules/font-awesome/fonts/* /app/geoportailv3_geoportal/jsapi/webfonts/
cp /app/geoportailv3_geoportal/static-ngeo/webfonts/*.* /app/geoportailv3_geoportal/jsapi/build/fonts/
cp /app/geoportailv3_geoportal/static-ngeo/webfonts/*.* /app/geoportailv3_geoportal/jsapi/webfonts/

mkdir -p /etc/static-ngeo/build/

npm run build-js
cp dist/apiv4.js /etc/static-ngeo/build/

npm run build-css
cp dist/apiv4.css /etc/static-ngeo/build/

npm run build-jsdoc
cp -r dist/apidoc/ /app/geoportailv3_geoportal/jsapi/build/
cp -r examples /app/geoportailv3_geoportal/jsapi/build/apidoc/
