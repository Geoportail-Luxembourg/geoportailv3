/**
 * @fileoverview Provides a feature popup service.
 */

goog.provide('app.FeaturePopup');

goog.require('app.featurePopupDirective');
goog.require('app.styleEditingDirective');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('ol.Coordinate');
goog.require('ol.MapProperty');
goog.require('ol.Overlay');



/**
 * @param {angular.$compile} $compile The compile provider.
 * @param {angular.Scope} $rootScope The rootScope provider.
 * @constructor
 * @ngInject
 */
app.FeaturePopup = function($compile, $rootScope) {

  /**
   * @type {ol.Collection<ol.Feature>?}
   * @private
   */
  this.features_;

  /**
   * The scope the compiled element is linked to.
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $rootScope.$new(true);

  var element = angular.element('<div app-feature-popup></div>');
  element.addClass('feature-popup');
  element.attr('app-feature-popup-feature', 'feature');

  // Compile the element, link it to the scope
  $compile(element)(this.scope_);

  /**
   * @type {ol.Overlay?}
   * @private
   */
  this.overlay_ = new ol.Overlay({
    element: element[0],
    autoPan: true,
    autoPanAnimation: /** @type {olx.animation.PanOptions} */ ({
      duration: 250
    })
  });
};


/**
 * @param {ol.Map} map Map.
 * @param {ol.Collection<ol.Feature>} features Features.
 */
app.FeaturePopup.prototype.init = function(map, features) {
  map.addOverlay(this.overlay_);
  this.features_ = features;
};


/**
 * @param {ol.Feature} feature
 * @param {ol.Coordinate=} opt_anchor
 */
app.FeaturePopup.prototype.show = function(feature, opt_anchor) {
  this.scope_['feature'] = feature;
  var anchor = goog.isDef(opt_anchor) ? opt_anchor : this.getAnchor(feature);
  this.overlay_.setPosition(anchor);
};


/**
 */
app.FeaturePopup.prototype.hide = function() {
  delete this.scope_['feature'];
  this.overlay_.setPosition(undefined);
  this.features_.clear();
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
