#!/bin/sh

echo "Ensuring we use same version of closure-util"

# We use a custom version of closure-util in our package.json.
# We also use the build.js task of OpenLayers which hardcodes its closure-util version.
# Ensure we use the same version everywhere.
[ ! -d node_modules/openlayers/node_modules ] && echo "Calling again npm install" && npm install

rm -rf node_modules/openlayers/node_modules/closure-util
ln -s ../../@camptocamp/closure-util node_modules/openlayers/node_modules/closure-util

rm -rf node_modules/closure-util
ln -s ./@camptocamp/closure-util node_modules/closure-util
