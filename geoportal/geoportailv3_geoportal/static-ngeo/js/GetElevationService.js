/**
 * @module app.GetElevationService
 */
let exports = {};

/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "elevation" web service.
 */

import appModule from './module.js';
import olProj from 'ol/proj.js';


/**
 * @param {angular.$http} $http The Angular $http service.
 * @param {angularGettext.Catalog} gettextCatalog The gettext service.
 * @param {string} elevationServiceUrl The URL to the "elevation" service.
 * @return {app.GetElevation} The getElevation function.
 * @private
 * @ngInject
 */
function service($http, gettextCatalog, elevationServiceUrl) {
  return getElevation;

  /**
   * @param {ol.Coordinate} coordinate The coordinate.
   * @return {!angular.$q.Promise} Promise providing the elevation object.
   */
  function getElevation(coordinate) {
    var lonlat = /** @type {ol.Coordinate} */
        (olProj.transform(coordinate,
            'EPSG:3857', 'EPSG:2169'));
    return $http.get(elevationServiceUrl, {
      params: {
        'lon': lonlat[0],
        'lat': lonlat[1]
      }
    }).then(
        /**
           * @param {angular.$http.Response} resp Ajax response.
           * @return {Object} The elevation object.
           */
            function(resp) {
              var text = gettextCatalog.getString('N/A');
              if (resp.data['dhm'] > 0) {
                text = parseInt(resp.data['dhm'] / 100, 0).toString() + ' m';
              }
              return {'formattedElevation': text,
                'rawElevation': resp.data['dhm']};
            });
  }
}


appModule.service('appGetElevation', service);


export default exports;
