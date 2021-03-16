/**
 * @module app.locationinfo.LocationInfoOverlay
 */
/**
 * @fileoverview Provides a location features service useful to share
 * information about the drawn features throughout the application.
 */

import appModule from '../module.js';
import Style from 'ol/style/Style.js';
import Circle from 'ol/style/Circle.js';
import Stroke from 'ol/style/Stroke.js';
import Fill from 'ol/style/Fill.js';

/**
 * @constructor
 * @param {ngeo.map.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager
 * @ngInject
 */
const exports = function(ngeoFeatureOverlayMgr) {

  /**
   * @type {ngeo.map.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = ngeoFeatureOverlayMgr.getFeatureOverlay();

  var defaultFill = new Fill({
    color: [255, 255, 0, 0.6]
  });
  var circleStroke = new Stroke({
    color: [255, 155, 55, 1],
    width: 3
  });

  var pointStyle = new Circle({
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
        return [new Style({
          image: pointStyle
        })];
      });
};

/**
 * Clear the feature overlay.
 */
exports.prototype.clear = function() {
  this.featureOverlay_.clear();
};

/**
 * @param {ol.Feature} feature The feature.
 */
exports.prototype.addFeature = function(feature) {
  this.featureOverlay_.addFeature(feature);
};

appModule.service('appLocationInfoOverlay', exports);


export default exports;
