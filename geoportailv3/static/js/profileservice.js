
/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "profile" web service.
 */
goog.provide('app.GetProfile');

goog.require('app');
goog.require('ol.proj');


/**
 * @typedef {function(ol.geom.Geometry):!angular.$q.Promise}
 */
app.GetProfile;


/**
 * @param {angular.$http} $http The Angular $http service.
 * @param {string} profileServiceUrl The URL to the "profile" service.
 * @return {app.GetProfile} The getProfile function.
 * @private
 * @ngInject
 */
app.getProfile_ = function($http, profileServiceUrl) {
  return getProfile;

  /**
   * @param {ol.geom.Geometry} geom
   * @return {!angular.$q.Promise} Promise providing the short URL.
   */
  function getProfile(geom) {
    var encOpt = {
      dataProjection: 'EPSG:2169',
      featureProjection: 'EPSG:3857'
    };
    var req = $.param({
      'geom': new ol.format.GeoJSON().writeGeometry(geom, encOpt),
      'nbPoints': 100,
      'layers': 'dhm'
    });
    var config = {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    };
    return $http.post(profileServiceUrl, req, config).then(
        function(resp) {
          return resp.data['profile'];
        });
  }
};

app.module.service('appGetProfile', app.getProfile_);
