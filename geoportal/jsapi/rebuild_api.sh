#!/bin/bash -e

BASEDIR=$(dirname "$0")
cd $BASEDIR/..

set -x

mkdir -p /app/geoportailv3_geoportal/jsapi/build/fonts
mkdir -p /app/geoportailv3_geoportal/jsapi/webfonts
cp node_modules/font-awesome/fonts/* /app/geoportailv3_geoportal/jsapi/build/fonts/
cp node_modules/font-awesome/fonts/* /app/geoportailv3_geoportal/jsapi/webfonts/
cp /app/geoportailv3_geoportal/static-ngeo/webfonts/*.* /app/geoportailv3_geoportal/jsapi/build/fonts/
cp /app/geoportailv3_geoportal/static-ngeo/webfonts/*.* /app/geoportailv3_geoportal/jsapi/webfonts/

node node_modules/openlayers/tasks/build.js /app/apiv3/jsapi/config.json /app/geoportailv3_geoportal/static-ngeo/build/apiv3.js
# The sourcemap is nonsensical, probably due to a GCC version way too old
# so it is better to disable it
# echo '//# sourceMappingURL=apiv3.js.map' >> /app/geoportailv3_geoportal/static-ngeo/build/apiv3.js

sed -i /app/geoportailv3_geoportal/static-ngeo/build/apiv3.js.map \
  -e 'sY/app/apiv3/node_modules/Y./jsapi_node_modules/Yg' \
  -e 'sY/app/apiv3/jsapi/src/Y./jsapi_src/Yg' \
  -e 'sY/app/apiv3/jsapi/closure/Y./jsapi_closure/Yg'

cat node_modules/proj4/dist/proj4.js node_modules/whatwg-fetch/fetch.js node_modules/d3/build/d3.min.js \
node_modules/mapbox-gl/dist/mapbox-gl.js \
node_modules/js-autocomplete/auto-complete.min.js \
node_modules/promise-polyfill/promise.min.js \
node_modules/url-polyfill/url-polyfill.min.js > /app/geoportailv3_geoportal/static-ngeo/build/vendor.js

./node_modules/.bin/lessc --clean-css /app/apiv3/jsapi/less/geoportailv3.api.less /app/geoportailv3_geoportal/static-ngeo/build/apiv3.css
node /app/apiv3/jsapi/jsdoc/get-ol3-doc-ref.js > /app/apiv3/.build/jsdocOl3.js

node node_modules/.bin/jsdoc /app/apiv3/jsapi/jsdoc/api/index.md -c /app/apiv3/jsapi/jsdoc/api/conf.json  -d /app/geoportailv3_geoportal/jsapi/build/apidoc
cp -R /app/apiv3/jsapi/examples /app/geoportailv3_geoportal/jsapi/build/apidoc/


cp /app/apiv3/node_modules/@camptocamp/closure-util/.deps/library/*/closure/goog/base.js /app/geoportailv3_geoportal/static-ngeo/build/
cp /app/apiv3/node_modules/mapbox-gl/dist/mapbox-gl.js.map /app/geoportailv3_geoportal/static-ngeo/build/

cd /app/geoportailv3_geoportal/static-ngeo/build/
rm -f jsapi_node_modules; ln -s /app/apiv3/node_modules jsapi_node_modules
rm -f jsapi_src; ln -s /app/apiv3/jsapi/src/ jsapi_src
rm -f jsapi_closure; ln -s /app/apiv3/jsapi/closure/ jsapi_closure

python3 /app/apiv3/jsapi/closure/depswriter.py --root_with_prefix=". ../../.." \
  --root_with_prefix="jsapi_node_modules/openlayers/src ./jsapi_node_modules/openlayers/src" \
  --root_with_prefix="jsapi_src jsapi_src" \
  --root_with_prefix="jsapi_closure jsapi_closure" \
  --root_with_prefix="jsapi_node_modules/ngeo/src ./jsapi_node_modules/ngeo/src" \
  --root_with_prefix="jsapi_node_modules/openlayers/build ./jsapi_node_modules/openlayers/build" \
  > deps.js
