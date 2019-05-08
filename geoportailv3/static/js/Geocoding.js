/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "geocoding" web service.
 */
goog.module('app.Geocoding');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');
const olProj = goog.require('ol.proj');


/**
 * @constructor
 * @param {angular.$http} $http The Angular $http service.
 * @param {string} reverseGeocodingServiceUrl The url of the service.
 * @param {string} geocodingServiceUrl The url of the service.
 * @ngInject
 */
exports = function($http, reverseGeocodingServiceUrl, geocodingServiceUrl) {
  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

  /**
   * @type {string}
   * @private
   */
  this.reverseGeocodingServiceUrl_ = reverseGeocodingServiceUrl;

  /**
   * @type {string}
   * @private
   */
  this.geocodingServiceUrl_ = geocodingServiceUrl;
};


/**
 * @param {ol.Coordinate} coordinate The coordinate.
 * @return {!angular.$q.Promise} Promise providing the reverse geocode.
 */
exports.prototype.reverseGeocode = function(coordinate) {
  var lonlat = /** @type {ol.Coordinate} */
      (olProj.transform(coordinate,
      'EPSG:3857', 'EPSG:2169'));

  return this.$http_.get(this.reverseGeocodingServiceUrl_, {
    params: {
      'easting': lonlat[0],
      'northing': lonlat[1]
    }
  }).then(
      /**
         * @param {angular.$http.Response} resp Ajax response.
         * @return {Object} The response
         */
          function(resp) {
            return resp['data'];
          });
};


/**
 * @param {string} address The address to geocode.
 * @return {!angular.$q.Promise} Promise providing the coordinates.
 */
exports.prototype.geocode = function(address) {

  return this.$http_.get(this.geocodingServiceUrl_, {
    params: {
      'queryString': address
    }
  }).then(
      /**
         * @param {angular.$http.Response} resp Ajax response.
         * @return {Object} The response
         */
          function(resp) {
            return resp['data'];
          });
};


appModule.service('appGeocoding', exports);
