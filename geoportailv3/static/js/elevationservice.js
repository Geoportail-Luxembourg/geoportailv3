/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "elevation" web service.
 */
goog.provide('app.GetElevation');

goog.require('app');
goog.require('ol.proj');


/**
 * @typedef {function(ol.Coordinate):!angular.$q.Promise}
 */
app.GetElevation;


/**
 * @param {angular.$http} $http The Angular $http service.
 * @param {angularGettext.Catalog} gettextCatalog
 * @param {string} elevationServiceUrl The URL to the "elevation" service.
 * @return {app.GetElevation} The getElevation function.
 * @private
 * @ngInject
 */
app.getElevation_ = function($http, gettextCatalog, elevationServiceUrl) {
  return getElevation;

  /**
       * @param {ol.Coordinate} coordinate
       * @return {!angular.$q.Promise} Promise providing the short URL.
       */
  function getElevation(coordinate) {
    var lonlat = /** @type {ol.Coordinate} */
        (ol.proj.transform(coordinate,
            'EPSG:3857', 'EPSG:2169'));
    return $http.get(elevationServiceUrl, {
      params: {
        'lon': lonlat[0],
        'lat': lonlat[1]
      }
    }).then(
        /**
           * @param {angular.$http.Response} resp Ajax response.
           * @return {string} The elevation
           */
            function(resp) {
              if (resp.data['dhm'] > 0) {
                return parseInt(resp.data['dhm'] / 100, 0).toString() + ' m';
              } else {
                return gettextCatalog.getString('N/A');
              }
            });
  }
};


app.module.service('appGetElevation', app.getElevation_);
