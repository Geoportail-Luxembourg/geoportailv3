/**
 * @fileoverview this file defines the mymaps webservice. this service
 * interacts with the Geoportail MyMaps webservice and exposes functions that
 * return objects representing maps and features.
 */

goog.provide('app.Mymaps');

goog.require('app');


/**
 * @typedef {Array.<Object>}
 */
app.MapsResponse;



/**
 * @constructor
 * @param {angular.$http} $http
 * @param {string} mymapsMapsUrl URL to "mymaps" Maps service.
 * @param {string} mymapsUrl URL to "mymaps" Features service.
 * @ngInject
 */
app.Mymaps = function($http, mymapsMapsUrl, mymapsUrl) {

  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

  /**
   * @type {string}
   * @private
   */
  this.mymapsMapsUrl_ = mymapsMapsUrl;

  /**
   * @type {string}
   * @private
   */
  this.mymapsFeaturesUrl_ = mymapsUrl + '/features/';

  /**
   * @type {string}
   * @private
   */
  this.mymapsMapInfoUrl_ = mymapsUrl + '/map/';
};


/**
 * Get an array of map objects.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.getMaps = function() {
  return this.$http_.get(this.mymapsMapsUrl_).then(goog.bind(
      /**
         * @param {angular.$http.Response} resp Ajax response.
         * @return {app.MapsResponse} The "mymaps" web service response.
         */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          return null;
        }
        return [];
      }, this)
  );
};


/**
 * Load map features
 * @param {string} mapId the mymaps Map Id.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.loadFeatures = function(mapId) {
  return this.$http_.get(this.mymapsFeaturesUrl_ + mapId).then(goog.bind(
      /**
         * @param {angular.$http.Response} resp Ajax response.
         * @return {app.MapsResponse} The "mymaps" web service response.
         */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        return [];
      }, this)
  );
};


/**
 * Load map information
 * @param {string} mapId the mymaps Map Id.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.loadMapInformation = function(mapId) {
  return this.$http_.get(this.mymapsMapInfoUrl_ + mapId).then(goog.bind(
      /**
         * @param {angular.$http.Response} resp Ajax response.
         * @return {app.MapsResponse} The "mymaps" web service response.
         */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        return [];
      }, this)
  );
};


app.module.service('appMymaps', app.Mymaps);
