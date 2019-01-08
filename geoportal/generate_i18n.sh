#!/bin/sh -ex

APP_OUTPUT_DIR=geoportailv3_geoportal/static-ngeo/build

create_locale_json() {
  lang=$1
  prefix="geoportailv3_geoportal/locale/$lang/LC_MESSAGES"
  c2cprefix="$prefix/geoportailv3_geoportal"
  files="$c2cprefix-client.po $c2cprefix-server.po $c2cprefix-tooltips.po $prefix/ngeo.po" 
  node node_modules/.bin/compile-catalog $files > $APP_OUTPUT_DIR/$lang.json
}

create_locale_json en
create_locale_json fr
create_locale_json lu
create_locale_json de
