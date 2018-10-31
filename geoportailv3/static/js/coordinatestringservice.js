/**
 * @fileoverview Provides a coordinate string output service, useful for
 * correctly formatted coordinate strings in different projections.
 */

goog.module('app.CoordinateStringService');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');
const olCoordinate = goog.require('ol.coordinate');
const olProj = goog.require('ol.proj');
const olString = goog.require('ol.string');


/**
 * @private
 * @return {app.CoordinateString} The coordinate string.
 * @ngInject
 */
function service() {
  return coordinateString;

  /**
   * @param {ol.Coordinate} coordinate The coordinate.
   * @param {string} sourceEpsgCode The source epsg.
   * @param {string} targetEpsgCode The target epsg.
   * @param {boolean} opt_DMS True if DMS.
   * @param {boolean} opt_DMm True if Degree decimal minutes.
   * @return {string} The coordinate string.
   */
  function coordinateString(coordinate, sourceEpsgCode,
      targetEpsgCode, opt_DMS, opt_DMm) {
    var str = '';
    if (targetEpsgCode === 'EPSG:3263*') {
      var lonlat = /** @type {ol.Coordinate} */
          (olProj.transform(coordinate, sourceEpsgCode, 'EPSG:4326'));
      targetEpsgCode = Math.floor(lonlat[0]) >= 6 ? 'EPSG:32632' : 'EPSG:32631';
    }

    coordinate = olProj.transform(coordinate, sourceEpsgCode, targetEpsgCode);

    switch (targetEpsgCode) {
      default:
      case 'EPSG:2169':
        str = olCoordinate.format(coordinate, '{x} E | {y} N', 0);
        break;
      case 'EPSG:4326':
        if (opt_DMS) {
          var hdms = toStringHDMS_(coordinate);
          var yhdms = hdms.split(' ').slice(0, 4).join(' ');
          var xhdms = hdms.split(' ').slice(4, 8).join(' ');
          str = xhdms + ' | ' + yhdms;
        } else if (opt_DMm) {
          var hdmm = toStringHDMm_(coordinate);
          var yhdmm = hdmm.split(' ').slice(0, 3).join(' ');
          var xhdmm = hdmm.split(' ').slice(3, 6).join(' ');
          str = xhdmm + ' | ' + yhdmm;
        } else {
          str = olCoordinate.format(coordinate, ' {x} E | {y} N', 5);
        }
        break;
      case 'EPSG:32632':
        str = olCoordinate.format(coordinate, '{x} | {y} (UTM32N)', 0);
        break;
      case 'EPSG:32631':
        str = olCoordinate.format(coordinate, '{x} | {y} (UTM31N)', 0);
        break;
    }
    return str;
  }

  /**
   * @private
   * @param {ol.Coordinate|undefined} coordinate Coordinate.
   * @return {string} Hemisphere, degrees, minutes and seconds.
   */
  function toStringHDMS_(coordinate) {
    if (coordinate !== undefined) {
      return degreesToStringHDMS_(coordinate[1], 'NS') + ' ' +
          degreesToStringHDMS_(coordinate[0], 'EW');
    } else {
      return '';
    }
  }

  /**
   * @private
   * @param {ol.Coordinate|undefined} coordinate Coordinate.
   * @return {string} Hemisphere, degrees, decimal minutes.
   */
  function toStringHDMm_(coordinate) {
    if (coordinate !== undefined) {
      return degreesToStringHDMm_(coordinate[1], 'NS') + ' ' +
          degreesToStringHDMm_(coordinate[0], 'EW');
    } else {
      return '';
    }
  }

  /**
   * @private
   * @param {number} degrees Degrees.
   * @param {string} hemispheres Hemispheres.
   * @return {string} String.
   */
  function degreesToStringHDMS_(degrees, hemispheres) {
    var normalizedDegrees = ((degrees + 180) % 360) - 180;
    var x = Math.abs(3600 * normalizedDegrees);
    return Math.floor(x / 3600) + '\u00b0 ' +
        olString.padNumber(Math.floor((x / 60) % 60), 2) + '\u2032 ' +
        olString.padNumber(Math.floor(x % 60), 2) + ',' +
        Math.floor((x - (x < 0 ? Math.ceil(x) : Math.floor(x))) * 10) +
        '\u2033 ' + hemispheres.charAt(normalizedDegrees < 0 ? 1 : 0);
  }

  /**
   * @private
   * @param {number} degrees Degrees.
   * @param {string} hemispheres Hemispheres.
   * @return {string} String.
   */
  function degreesToStringHDMm_(degrees, hemispheres) {
    var normalizedDegrees = ((degrees + 180) % 360) - 180;
    var x = Math.abs(3600 * normalizedDegrees);
    var dd = x / 3600;
    var m = (dd - Math.floor(dd)) * 60;

    var res = Math.floor(dd) + '\u00b0 ' +
        olString.padNumber(Math.floor(m), 2) + ',' +
        Math.floor((m - Math.floor(m)) * 100000) +
        '\u2032 ' + hemispheres.charAt(normalizedDegrees < 0 ? 1 : 0);
    return res;
  }

};


appModule.service('appCoordinateString', service);
