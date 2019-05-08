#!/bin/sh -ex

LANG=$1
VERSION=`grep '"angular"' package.json | cut --delimiter \" --fields 4 | tr --delete '\r\n'`

curl \
  --output /opt/angular-locale/angular-locale_$LANG.js \
  https://raw.githubusercontent.com/angular/angular.js/v$VERSION/src/ngLocale/angular-locale_$LANG.js
