#!/bin/sh
# wget --no-host-directories --force-directories https://vectortiles.geoportail.lu/data/hillshade-lu.json

rm -rf ios_bundle; mkdir ios_bundle; cd ios_bundle
wget --no-host-directories --force-directories https://vectortiles.geoportail.lu/data/omt-geoportail-lu.json
wget --no-host-directories --force-directories https://vectortiles.geoportail.lu/fonts/Noto%20Sans%20Regular/0-255.pbf
wget --no-host-directories --force-directories https://vectortiles.geoportail.lu/fonts/Noto%20Sans%20Regular/256-511.pbf
wget --no-host-directories --force-directories https://vectortiles.geoportail.lu/fonts/Noto%20Sans%20Bold/0-255.pbf
wget --no-host-directories --force-directories https://vectortiles.geoportail.lu/fonts/Noto%20Sans%20Bold/256-511.pbf
wget --no-host-directories --force-directories https://vectortiles.geoportail.lu/styles/roadmap/style.json
sed 'sYhttps://vectortiles.geoportail.lu/data/omt-geoportail-lu.jsonYhttp://localhost:8765/data/omt-geoportail-lu.jsonYg' -i styles/roadmap/style.json
sed 'sYhttps://vectortiles.geoportail.lu/fonts/Yhttp://localhost:8765/fonts/Yg' -i styles/roadmap/style.json
wget http://download.geoportail.lu/index.php/s/o7ZmTx7ySpgZgF7/download -O omt-geoportail-lu.mbtiles
