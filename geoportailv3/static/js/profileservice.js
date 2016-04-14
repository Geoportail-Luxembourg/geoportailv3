
/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "profile" web service.
 */
goog.provide('app.GetProfile');

goog.require('app');
goog.require('ol.proj');


/**
 * @typedef {function(
 *  (ol.geom.MultiLineString|ol.geom.LineString),
 *  string=):!angular.$q.Promise
 *  }
 */
app.GetProfile;


/**
 * @param {angular.$http} $http The Angular $http service.
 * @param {string} profileServiceUrl The URL to the "profile" service.
 * @return {app.GetProfile} The getProfile function.
 * @private
 * @ngInject
 */
app.getProfile_ = function($http, profileServiceUrl) {
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
      'geom': new ol.format.GeoJSON().writeGeometry(geom, encOpt),
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
          var q = new goog.Uri.QueryData(data);
          var id = q.getValues('id')[0];
          goog.array.forEach(resp.data['profile'], function(element) {
            element['id'] = id;
          });
          return resp.data['profile'];
        });
  }
};

app.module.service('appGetProfile', app.getProfile_);
