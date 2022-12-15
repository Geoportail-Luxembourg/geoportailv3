#!/bin/bash -e

set -x

mkdir -p /app/geoportailv3_geoportal/jsapi/build/fonts
mkdir -p /app/geoportailv3_geoportal/jsapi/webfonts
cp node_modules/font-awesome/fonts/* /app/geoportailv3_geoportal/jsapi/build/fonts/
cp node_modules/font-awesome/fonts/* /app/geoportailv3_geoportal/jsapi/webfonts/
cp /app/geoportailv3_geoportal/static-ngeo/webfonts/*.* /app/geoportailv3_geoportal/jsapi/build/fonts/
cp /app/geoportailv3_geoportal/static-ngeo/webfonts/*.* /app/geoportailv3_geoportal/jsapi/webfonts/

mkdir -p /etc/static-ngeo/build/

cp vendor/ol/ol.* /etc/static-ngeo/build/
cp node_modules/proj4/dist/proj4.js /etc/static-ngeo/build/
cp node_modules/js-autocomplete/auto-complete.min.js /etc/static-ngeo/build/

npm run build-js
cp dist/apiv4.js /etc/static-ngeo/build/

cat /etc/static-ngeo/build/ol.js > /etc/static-ngeo/build/apiv4-full-async.js
echo "" >> /etc/static-ngeo/build/apiv4-full-async.js
echo "/*! include proj4 */" >> /etc/static-ngeo/build/apiv4-full-async.js
cat /etc/static-ngeo/build/proj4.js >> /etc/static-ngeo/build/apiv4-full-async.js
echo "" >> /etc/static-ngeo/build/apiv4-full-async.js
echo "proj4.defs('EPSG:2169', '+proj=tmerc +lat_0=49.83333333333334 +lon_0=6.166666666666667 +k=1 +x_0=80000 +y_0=100000 +ellps=intl +towgs84=-189.681,18.3463,-42.7695,-0.33746,-3.09264,2.53861,0.4598 +units=m +no_defs');" >> /etc/static-ngeo/build/apiv4-full-async.js
echo "ol.proj.proj4.register(proj4);" >> /etc/static-ngeo/build/apiv4-full-async.js
mv /etc/static-ngeo/build/apiv4-full-async.js  /etc/static-ngeo/build/apiv4-full-async.js2
echo "" >> /etc/static-ngeo/build/apiv4-full-async.js2
echo "/*! include autocomplete */" >> /etc/static-ngeo/build/apiv4-full-async.js2
cat /etc/static-ngeo/build/auto-complete.min.js >> /etc/static-ngeo/build/apiv4-full-async.js2
echo "" >> /etc/static-ngeo/build/apiv4-full-async.js2
echo "/*! include apiv4 */" >> /etc/static-ngeo/build/apiv4-full-async.js2
cat /etc/static-ngeo/build/apiv4.js >> /etc/static-ngeo/build/apiv4-full-async.js2
mv /etc/static-ngeo/build/apiv4-full-async.js2 /etc/static-ngeo/build/apiv4-full-async.js
echo "" >> /etc/static-ngeo/build/apiv4-full-async.js
echo "lux.setBaseUrl('https://apiv4.geoportail.lu/', 'https');" >> /etc/static-ngeo/build/apiv4-full-async.js
echo "lux.setI18nUrl('https://apiv4.geoportail.lu/static-ngeo/build/fr.json');" >> /etc/static-ngeo/build/apiv4-full-async.js

npm run build-css
cp dist/apiv4.css /etc/static-ngeo/build/

npm run build-jsdoc
cp -r dist/apidoc/ /app/geoportailv3_geoportal/jsapi/build/
cp -r examples /app/geoportailv3_geoportal/jsapi/build/apidoc/
