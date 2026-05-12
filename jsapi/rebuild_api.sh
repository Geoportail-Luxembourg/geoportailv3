#!/usr/bin/env bash

set -euo pipefail
set -x

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

DIST_DIR="${DIST_DIR:-${SCRIPT_DIR}/dist}"
STATIC_BUILD_DIR="${STATIC_BUILD_DIR:-${DIST_DIR}/build}"
FONTS_DIR="${FONTS_DIR:-${DIST_DIR}/fonts}"
WEBFONTS_DIR="${WEBFONTS_DIR:-${DIST_DIR}/webfonts}"
ASSETS_FONTS_DIR="${ASSETS_FONTS_DIR:-${SCRIPT_DIR}/assets/fonts}"
BASE_URL="${BASE_URL:-https://apiv4.geoportail.lu/}"
I18N_URL="${I18N_URL:-https://apiv4.geoportail.lu/static-ngeo/build/fr.json}"

mkdir -p "${DIST_DIR}" "${STATIC_BUILD_DIR}" "${FONTS_DIR}" "${WEBFONTS_DIR}"

cp node_modules/font-awesome/fonts/* "${FONTS_DIR}/"
cp node_modules/font-awesome/fonts/* "${WEBFONTS_DIR}/"
if [ -d "${ASSETS_FONTS_DIR}" ] && compgen -G "${ASSETS_FONTS_DIR}/*" > /dev/null; then
	cp "${ASSETS_FONTS_DIR}"/* "${FONTS_DIR}/"
	cp "${ASSETS_FONTS_DIR}"/* "${WEBFONTS_DIR}/"
fi

cp vendor/ol/ol.* "${STATIC_BUILD_DIR}/"
cp node_modules/proj4/dist/proj4.js "${STATIC_BUILD_DIR}/"
cp node_modules/js-autocomplete/auto-complete.min.js "${STATIC_BUILD_DIR}/"

npm run build-js
cp dist/apiv4.js "${STATIC_BUILD_DIR}/"

cat "${STATIC_BUILD_DIR}/ol.js" > "${STATIC_BUILD_DIR}/apiv4-full-async.js"
echo "" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js"
echo "/*! include proj4 */" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js"
cat "${STATIC_BUILD_DIR}/proj4.js" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js"
echo "" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js"
echo "proj4.defs('EPSG:2169', '+proj=tmerc +lat_0=49.83333333333334 +lon_0=6.166666666666667 +k=1 +x_0=80000 +y_0=100000 +ellps=intl +towgs84=-189.681,18.3463,-42.7695,-0.33746,-3.09264,2.53861,0.4598 +units=m +no_defs');" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js"
echo "ol.proj.proj4.register(proj4);" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js"
mv "${STATIC_BUILD_DIR}/apiv4-full-async.js" "${STATIC_BUILD_DIR}/apiv4-full-async.js2"
echo "" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js2"
echo "/*! include autocomplete */" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js2"
cat "${STATIC_BUILD_DIR}/auto-complete.min.js" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js2"
echo "" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js2"
echo "/*! include apiv4 */" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js2"
cat "${STATIC_BUILD_DIR}/apiv4.js" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js2"
mv "${STATIC_BUILD_DIR}/apiv4-full-async.js2" "${STATIC_BUILD_DIR}/apiv4-full-async.js"
echo "" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js"
echo "lux.setBaseUrl('${BASE_URL}', 'https');" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js"
echo "lux.setI18nUrl('${I18N_URL}');" >> "${STATIC_BUILD_DIR}/apiv4-full-async.js"

npm run build-css
cp dist/apiv4.css "${STATIC_BUILD_DIR}/"
cp apiv4loader.js "${DIST_DIR}/"
cp lang_fr.json "${DIST_DIR}/"

npm run build-jsdoc
cp -r examples "${DIST_DIR}/apidoc/"
cp examples/theme.css "${DIST_DIR}/apidoc/theme.css"
cp examples/lion.png "${DIST_DIR}/apidoc/lion.png"
cp examples/DemoGPX.gpx "${DIST_DIR}/apidoc/DemoGPX.gpx"
cp examples/gpx-trace.gpx "${DIST_DIR}/apidoc/gpx-trace.gpx"
cp examples/elements.kml "${DIST_DIR}/apidoc/elements.kml"
cp examples/bikepoint.json "${DIST_DIR}/apidoc/bikepoint.json"
cp examples/icon.png "${DIST_DIR}/apidoc/icon.png"
