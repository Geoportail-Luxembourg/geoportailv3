#!/bin/bash -e

APP_OUTPUT_DIR=geoportailv3_geoportal/static-ngeo/build
LOCALE=geoportailv3_geoportal/locale
LANGS="en fr lb de"


blue() {
  echo -e "\e[34m\e[1m$*\e[0m"
}

prefix() {
  lang=$1
  prefix="geoportal/geoportailv3_geoportal/locale/$lang/LC_MESSAGES"
  echo $prefix
}

create_ui_jsons() {
  blue "create UI jsons"
  for lang in $LANGS
  do
    prefix="`prefix $lang`"
    c2cprefix="$prefix/geoportailv3_geoportal"
    files="$c2cprefix-client.po $prefix/ngeo.po" 
    echo "-> $APP_OUTPUT_DIR/$lang.json"
    node geoportal/node_modules/.bin/compile-catalog $files > $APP_OUTPUT_DIR/$lang.json
  done
}

create_mo_files() {
  blue "create mo files"
  for lang in $LANGS
  do
    c2cprefix="`prefix $lang`/geoportailv3_geoportal"
    files="$c2cprefix-server $c2cprefix-tooltips"
    for f in $files
    do
      echo "-> $f.mo"
      msgfmt -o $f.mo $f.po
    done
  done
}

clean_ngeo_en_po() {
  blue "Retrieve transifex translations"
  rm -f `prefix en`/ngeo.po # For English it is enough (and working) to use keys as values
}


clean_ngeo_en_po
create_mo_files
create_ui_jsons
echo done
