/**
 * @fileoverview Provides a feature info service.
 */

goog.provide('app.FeaturePopup');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('ol.Coordinate');
goog.require('ol.MapProperty');
goog.require('ol.Overlay');



/**
 * @constructor
 */
app.FeaturePopup = function() {

  /**
   * @type {ol.Overlay?}
   * @private
   */
  this.overlay_ = new ol.Overlay({
    element: goog.dom.createDom(goog.dom.TagName.DIV, 'feature-popup',
        'something'),
    autoPan: true
  });
};


/**
 * @param {ol.Map} map Map.
 */
app.FeaturePopup.prototype.init = function(map) {
  map.addOverlay(this.overlay_);
};


/**
 * @param {ol.Feature} feature
 */
app.FeaturePopup.prototype.show = function(feature) {
  var anchor = this.getAnchor(feature);
  this.overlay_.setPosition(anchor);
};


/**
 */
app.FeaturePopup.prototype.hide = function() {
  this.overlay_.setPosition();
};


/**
 * @param {ol.Feature} feature
 * @return {?ol.Coordinate}
 */
app.FeaturePopup.prototype.getAnchor = function(feature) {
  var geometry = feature.getGeometry();
  switch (geometry.getType()) {
    case ol.geom.GeometryType.POINT:
      goog.asserts.assertInstanceof(geometry, ol.geom.Point,
          'geometry should be an ol.geom.Point');
      return geometry.getFlatCoordinates();
    case ol.geom.GeometryType.LINE_STRING:
      goog.asserts.assertInstanceof(geometry, ol.geom.LineString,
          'geometry should be an ol.geom.LineString');
      return geometry.getFlatMidpoint();
    case ol.geom.GeometryType.POLYGON:
      goog.asserts.assertInstanceof(geometry, ol.geom.Polygon,
          'geometry should be an ol.geom.Polygon');
      return geometry.getFlatInteriorPoint();
    default:
      goog.asserts.fail('Unsupported geometry type');
      return null;
  }
};


app.module.service('appFeaturePopup', app.FeaturePopup);
