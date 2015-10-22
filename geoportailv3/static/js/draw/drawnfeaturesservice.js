/**
 * @fileoverview Provides a dranw features service useful to share
 * information about the selected feature throughout the application.
 */

goog.provide('app.DrawnFeatures');

goog.require('app');
goog.require('ngeo.Location');
goog.require('ngeo.format.FeatureHash');
goog.require('ol.Collection');



/**
 * @constructor
 * @param {ngeo.Location} ngeoLocation Location service.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @ngInject
 */
app.DrawnFeatures = function(ngeoLocation, appMymaps) {

  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

  /**
   * @type {ol.Collection}
   */
  this.features = new ol.Collection();

  /**
   * @type {ngeo.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  /**
   * @type {ngeo.format.FeatureHash}
   * @private
   */
  this.fhFormat_ = new ngeo.format.FeatureHash({
    encodeStyles: false,
    properties: (
        /**
         * @param {ol.Feature} feature Feature.
         * @return {Object.<string, (string|number)>} Properties to encode.
         */
        function(feature) {
          // Do not encode the __editable__ and __selected__ properties.
          var properties = feature.getProperties();
          delete properties['__editable__'];
          delete properties['__selected__'];
          for (var key in properties) {
            if (goog.isNull(properties[key])) {
              delete properties[key];
            }
          }
          return properties;
        })
  });

  /**
   * @type {ol.FeatureStyleFunction}
   * @private
   */
  this.featureStyleFunction_ = this.appMymaps_.createStyleFunction();
};


/**
 * @param {ol.Feature} feature
 */
app.DrawnFeatures.prototype.remove = function(feature) {
  this.features.remove(feature);
  if (feature.get('__source__') == 'mymaps') {
    if (this.appMymaps_.isEditable()) {
      this.appMymaps_.deleteFeature(feature);
    }
  }

  this.encodeFeaturesInUrl_(this.features.getArray());
};


/**
 * @param {ol.Feature} feature
 */
app.DrawnFeatures.prototype.add = function(feature) {
  var features = this.features.getArray().slice();
  features.push(feature);
  this.saveFeature(feature);
  this.encodeFeaturesInUrl_(features);
};


/**
 * @param {Array.<ol.Feature>} features Features to encode in the URL.
 * @private
 */
app.DrawnFeatures.prototype.encodeFeaturesInUrl_ = function(features) {
  var featuresToEncode = features.filter(function(feature) {
    return feature.get('__source__') != 'mymaps';
  });

  if (featuresToEncode.length > 0) {
    this.ngeoLocation_.updateParams({
      'features': this.fhFormat_.writeFeatures(featuresToEncode)
    });
  } else {
    this.ngeoLocation_.deleteParam('features');
  }
};


/**
 * @param {ol.Feature} feature the feature to save.
 */
app.DrawnFeatures.prototype.saveFeature = function(feature) {

  if (this.appMymaps_.isEditable()) {
    feature.set('__source__', 'mymaps');
    this.saveFeatureInMymaps_(feature);
  }
  this.encodeFeaturesInUrl_(this.features.getArray());
};


/**
 * Decode the features encoded in the URL and add them to the collection
 * of drawn features.
 */
app.DrawnFeatures.prototype.drawFeaturesInUrl = function() {
  var encodedFeatures = this.ngeoLocation_.getParam('features');
  if (goog.isDef(encodedFeatures)) {
    var remoteFeatures = this.fhFormat_.readFeatures(encodedFeatures);
    goog.asserts.assert(!goog.isNull(remoteFeatures));
    for (var i = 0; i < remoteFeatures.length; ++i) {
      var feature = remoteFeatures[i];
      var opacity = /** @type {string} */ (feature.get('opacity'));
      feature.set('opacity', +opacity);
      var stroke = /** @type {string} */ (feature.get('stroke'));
      feature.set('stroke', +stroke);
      var size = /** @type {string} */ (feature.get('size'));
      feature.set('size', +size);
      var angle = /** @type {string} */ (feature.get('angle'));
      feature.set('angle', +angle);
      var isLabel = /** @type {string} */ (feature.get('is_label'));
      feature.set('is_label', isLabel === 'true');
      feature.set('__editable__', true);
      feature.set('__source__', 'url');
      feature.setStyle(this.featureStyleFunction_);
    }
    this.features.extend(remoteFeatures);
  }
};


/**
 * @param {ol.Feature} feature Feature to encode in the URL.
 * @private
 */
app.DrawnFeatures.prototype.saveFeatureInMymaps_ = function(feature) {
  var currentFeature = feature;
  if (this.appMymaps_.isEditable()) {
    this.appMymaps_.saveFeature(feature)
      .then(goog.bind(function(resp) {
          var featureId = resp['id'];
          currentFeature.set('id', featureId);
        }, this));
  }
};


/**
 * clear
 */
app.DrawnFeatures.prototype.clear = function() {
  this.features.clear();
  this.appMymaps_.clear();
};


/**
 * get an Array
 * @return {Array.<ol.Feature>?} The features array
 */
app.DrawnFeatures.prototype.getArray = function() {
  return this.features.getArray();
};


/**
 * get an Array
 * @return {ol.Collection} The ollection of drawn features
 */
app.DrawnFeatures.prototype.getCollection = function() {
  return this.features;
};

app.module.service('appDrawnFeatures', app.DrawnFeatures);
