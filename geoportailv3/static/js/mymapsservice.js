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

  /**
   * @type {string}
   * @private
   */
  this.mymapsDeleteFeatureUrl_ = mymapsUrl + '/delete_feature/';

  /**
   * @type {string}
   * @private
   */
  this.mymapsDeleteMapUrl_ = mymapsUrl + '/delete/';

  /**
   * @type {string}
   * @private
   */
  this.mymapsCreateMapUrl_ = mymapsUrl + '/create';

  /**
   * @type {string}
   * @private
   */
  this.mymapsUpdateMapUrl_ = mymapsUrl + '/update/';

  /**
   * @type {?string}
   * @private
   */
  this.mapId_ = null;
};


/**
 * @param {?string} mapId the map id.
 */
app.Mymaps.prototype.setCurrentMapId = function(mapId) {
  this.mapId_ = mapId;
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
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.loadFeatures = function() {
  return this.$http_.get(this.mymapsFeaturesUrl_ + this.mapId_).then(goog.bind(
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
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.loadMapInformation = function() {
  return this.$http_.get(this.mymapsMapInfoUrl_ + this.mapId_).then(goog.bind(
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
 * @param {ol.Feature} feature the feature to delete.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.deleteFeature = function(feature) {
  return this.$http_.delete(this.mymapsDeleteFeatureUrl_ +
      feature.get('id')).then(goog.bind(
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
 * create a new map
 * @param {string} title the title of the map.
 * @param {string} description a description about the map.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.createMap = function(title, description) {
  var req = $.param({
    'title': title,
    'description': description
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  return this.$http_.post(this.mymapsCreateMapUrl_, req, config).then(
      goog.bind(
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
 * delete a new map
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.deleteMap = function() {
  return this.$http_.delete(this.mymapsDeleteMapUrl_ + this.mapId_).then(
      goog.bind(
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
 * Save the map
 * @param {string} title the title of the map.
 * @param {string} description a description about the map.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.updateMap = function(title, description) {
  var req = $.param({
    'title': title,
    'description': description
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  return this.$http_.put(this.mymapsUpdateMapUrl_ + this.mapId_,
      req, config).then(goog.bind(
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
