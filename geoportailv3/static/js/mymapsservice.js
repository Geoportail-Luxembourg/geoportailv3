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
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {app.StateManager} appStateManager
 * @ngInject
 */
app.Mymaps = function($http, mymapsMapsUrl, mymapsUrl, appDrawnFeatures,
    appStateManager) {

  /**
   * @type {ol.Collection.<ol.Feature>}
   * @private
   */
  this.drawnFeatures_ = appDrawnFeatures;

  /**
   * @type {app.StateManager}
   * @private
   */
  this.stateManager_ = appStateManager;

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
   * @type {string}
   * @private
   */
  this.mymapsSaveFeatureUrl_ = mymapsUrl + '/save_feature/';

  /**
   * @type {?string}
   * @private
   */
  this.mapId_ = null;

  /**
   * The currently displayed map title.
   * @type {string}
   * @export
   */
  this.mapTitle = '';

  /**
   * The currently displayed map description.
   * @type {string}
   * @export
   */
  this.mapDescription = '';

  /**
   * @type {ol.FeatureStyleFunction}
   * @private
   */
  this.featureStyleFunction_ = app.DrawController.createStyleFunction();

  /**
   * @type {ol.proj.Projection}
   * @export
   */
  this.mapProjection;
};


/**
 * @param {?string} mapId the map id.
 */
app.Mymaps.prototype.setCurrentMapId = function(mapId) {
  this.mapId_ = mapId;
  if (goog.isDefAndNotNull(this.mapId_)) {
    this.stateManager_.updateState({
      'map_id': this.mapId_
    });
    this.loadMapInformation_().then(
        goog.bind(function(mapinformation) {
          this.mapDescription = mapinformation['description'];
          this.mapTitle = mapinformation['title'];
        }, this));
    this.loadFeatures_().then(goog.bind(function(features) {
      var encOpt = /** @type {olx.format.ReadOptions} */ ({
        dataProjection: 'EPSG:2169',
        featureProjection: this.mapProjection
      });
      var jsonFeatures = ((new ol.format.GeoJSON()).
          readFeatures(features, encOpt));
      for (var i in jsonFeatures) {
        jsonFeatures[i].set('__source__', 'mymaps');
        jsonFeatures[i].set('__editable__', true);
        jsonFeatures[i].setStyle(this.featureStyleFunction_);
      }
      this.drawnFeatures_.extend(/** @type {!Array<(null|ol.Feature)>} */
          (jsonFeatures));
    }, this));
  }else {
    this.stateManager_.deleteParam('map_id');
    this.mapId_ = null;
    this.mapTitle = '';
    this.mapDescription = '';
    this.drawnFeatures_.clear();
  }
};


/**
 * @return {?string} mapId the map id.
 */
app.Mymaps.prototype.getCurrentMapId = function() {
  return this.mapId_;
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
 * @private
 */
app.Mymaps.prototype.loadFeatures_ = function() {
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
 * @private
 */
app.Mymaps.prototype.loadMapInformation_ = function() {
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
 * Delete a map
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

  this.mapTitle = title;
  this.mapDescription = description;

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


/**
 * Save the map
 * @param {ol.Feature} feature the feature to save
 * @param {?ol.proj.Projection} featureProjection
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.saveFeature = function(feature, featureProjection) {
  var encOpt = /** @type {olx.format.ReadOptions} */ ({
    dataProjection: 'EPSG:2169',
    featureProjection: featureProjection
  });
  var req = $.param({
    'feature': (new ol.format.GeoJSON()).writeFeature(feature, encOpt)
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  return this.$http_.post(this.mymapsSaveFeatureUrl_ + this.mapId_,
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
