/**
 * @fileoverview Provides a location features service useful to share
 * information about the drawn features throughout the application.
 */

goog.provide('app.LocationInfoOverlay');

goog.require('app.module');
goog.require('ol.style');


/**
 * @constructor
 * @param {ngeo.map.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager
 * @ngInject
 */
app.LocationInfoOverlay = function(ngeoFeatureOverlayMgr) {

  /**
   * @type {ngeo.map.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = ngeoFeatureOverlayMgr.getFeatureOverlay();

  var defaultFill = new ol.style.Fill({
    color: [255, 255, 0, 0.6]
  });
  var circleStroke = new ol.style.Stroke({
    color: [255, 155, 55, 1],
    width: 3
  });

  var pointStyle = new ol.style.Circle({
    radius: 10,
    fill: defaultFill,
    stroke: circleStroke
  });

  this.featureOverlay_.setStyle(
      /**
       * @param {ol.Feature|ol.render.Feature} feature Feature.
       * @param {number} resolution Resolution.
       * @return {Array.<ol.style.Style>} Array of styles.
       */
      function(feature, resolution) {
        return [new ol.style.Style({
          image: pointStyle
        })];
      });
};

/**
 * Clear the feature overlay.
 */
app.LocationInfoOverlay.prototype.clear = function() {
  this.featureOverlay_.clear();
};

/**
 * @param {ol.Feature} feature The feature.
 */
app.LocationInfoOverlay.prototype.addFeature = function(feature) {
  this.featureOverlay_.addFeature(feature);
};

app.module.service('appLocationInfoOverlay', app.LocationInfoOverlay);
