/**
 * @module app.GetProfileService
 */
let exports = {};

/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "profile" web service.
 */

import appModule from './module.js';
import olFormatGeoJSON from 'ol/format/GeoJSON.js';


/**
 * @param {angular.$http} $http The Angular $http service.
 * @param {string} profileServiceUrl The URL to the "profile" service.
 * @return {app.GetProfile} The getProfile function.
 * @private
 * @ngInject
 */
function service($http, profileServiceUrl) {
  return getProfile;

  /**
   * @param {(ol.geom.MultiLineString|ol.geom.LineString)} geom The geometry.
   * @param {string=} opt_id The id.
   * @return {!angular.$q.Promise} Promise providing the short URL.
   */
  function getProfile(geom, opt_id) {
    var encOpt = {
      dataProjection: 'EPSG:2169',
      featureProjection: 'EPSG:3857'
    };
    var req = $.param({
      'geom': new olFormatGeoJSON().writeGeometry(geom, encOpt),
      'nbPoints': 100,
      'layers': 'dhm',
      'id': opt_id
    });
    var config = {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    };
    return $http.post(profileServiceUrl, req, config).then(
        function(resp) {
          var data = /** @type {string} */ (resp.config.data);
          var ids = data.split('&').find(function(elem) {
            return (elem.split('=')[0] === 'id');
          });
          var id = ids.split('=')[1];
          var elevationGain = 0;
          var elevationLoss = 0;
          var cumulativeElevation = 0;
          var lastElevation;

          resp.data['profile'].forEach(function(element) {
            element['id'] = id;
            var curElevation = (element['values']['dhm']) / 100;
            if (lastElevation !== undefined) {
              var elevation = curElevation - lastElevation;
              cumulativeElevation = cumulativeElevation + elevation;
              if (elevation > 0) {
                elevationGain = elevationGain + elevation;
              } else {
                elevationLoss = elevationLoss + elevation;
              }
            }
            element['cumulativeElevation'] = cumulativeElevation;
            element['elevationGain'] = elevationGain;
            element['elevationLoss'] = elevationLoss;
            lastElevation = curElevation;
          });
          return resp.data['profile'];
        });
  }
}

appModule.service('appGetProfile', service);


export default exports;
