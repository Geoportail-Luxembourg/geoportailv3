/**
 * @fileoverview Provides a coordinate string output service, useful for
 * correctly formatted coordinate strings in different projections.
 */

goog.provide('app.CoordinateString');

goog.require('app.projections');
goog.require('ol.proj');


/**
 * @typedef {function(ol.Coordinate, string, string, boolean=):string}
 */
app.CoordinateString;


/**
 * @private
 * @return {app.CoordinateString}
 * @ngInject
 */
app.coordinateString_ = function() {
  return coordinateString;

  /**
   * @param {ol.Coordinate} coordinate
   * @param {string} sourceEpsgCode
   * @param {string} targetEpsgCode
   * @param {boolean=} opt_DMS
   * @return {string}
   */
  function coordinateString(coordinate, sourceEpsgCode,
      targetEpsgCode, opt_DMS) {
    var str = '';
    if (targetEpsgCode === 'EPSG:3263*') {
      var lonlat = /** @type {ol.Coordinate} */
          (ol.proj.transform(coordinate, sourceEpsgCode, 'EPSG:4326'));
      targetEpsgCode = Math.floor(lonlat[0]) >= 6 ? 'EPSG:32632' : 'EPSG:32631';
    }

    coordinate = ol.proj.transform(coordinate, sourceEpsgCode, targetEpsgCode);

    switch (targetEpsgCode) {
      case 'EPSG:2169':
        str = ol.coordinate.format(coordinate, '{x} E | {y} N', 0);
        break;
      case 'EPSG:4326':
        if (goog.isDef(opt_DMS) && opt_DMS === true) {
          var hdms = ol.coordinate.toStringHDMS(coordinate);
          var yhdms = hdms.split(' ').slice(0, 4).join(' ');
          var xhdms = hdms.split(' ').slice(4, 8).join(' ');
          var template = xhdms + ' | ' + yhdms;
          str = ol.coordinate.format(coordinate, template, 5);
        } else {
          var template = ' {x} E | {y} N';
          str = ol.coordinate.format(coordinate, template, 5);
        }
        break;
      case 'EPSG:32632':
        str = ol.coordinate.format(coordinate, '{x} | {y} (UTM32N)', 0);
        break;
      case 'EPSG:32631':
        str = ol.coordinate.format(coordinate, '{x} | {y} (UTM31N)', 0);
        break;
    }
    return str;
  }
};

app.module.service('appCoordinateString', app.coordinateString_);
