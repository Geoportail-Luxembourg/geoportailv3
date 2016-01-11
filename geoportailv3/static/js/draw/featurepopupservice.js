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
 * @param {Document} $document The document.
 * @constructor
 * @ngInject
 */
app.FeaturePopup = function($compile, $rootScope, $document) {

  /**
   * @type {Document}
   * @private
   */
  this.$document_ = $document;

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_;

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

  /**
   * @type {goog.events.Key?}
   * @private
   */
  this.mousemoveEvent_ = null;

  /**
   * @type {goog.events.Key?}
   * @private
   */
  this.mousedownEvent_ = null;

  /**
   * @type {ol.Coordinate?}
   * @private
   */
  this.startingDragPoint_ = null;

  /**
   * @type {ol.Coordinate?|undefined}
   * @private
   */
  this.startingAnchorPoint_ = null;

  /**
   * @type {angular.JQLite}
   * @private
   */
  this.element_ = angular.element('<div app-feature-popup></div>');
  this.element_.addClass('feature-popup');
  this.element_.attr('app-feature-popup-feature', 'feature');
  this.element_.attr('app-feature-popup-map', 'map');


  // Compile the element, link it to the scope
  $compile(this.element_)(this.scope_);

  /**
   * @type {ol.Overlay?}
   * @private
   */
  this.overlay_ = new ol.Overlay({
    element: this.element_[0],
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
  this.map_ = map;
  this.map_.addOverlay(this.overlay_);
  this.features_ = features;
};


/**
 * @param {angular.JQLite} element
 */
app.FeaturePopup.prototype.setDraggable = function(element) {
  this.mousedownEvent_ = goog.events.listen(element[0], 'mousedown',
      goog.bind(function(event) {
        this.element_.css({'transform': 'scale(1.1)',
          'transition': 'transform .3s'});
        if (goog.isNull(this.mousemoveEvent_)) {
          this.mousemoveEvent_ = goog.events.listen(this.map_,
              ol.MapBrowserEvent.EventType.POINTERMOVE, goog.bind(function(e) {
                if (!this.startingDragPoint_) {
                  this.startingAnchorPoint_ = this.overlay_.getPosition();
                  this.startingDragPoint_ = e.coordinate;
                }
                var currentDragPoint = e.coordinate;
                this.overlay_.setPosition(
                    [this.startingAnchorPoint_[0] + currentDragPoint[0] -
                     this.startingDragPoint_[0],
                     this.startingAnchorPoint_[1] + currentDragPoint[1] -
                     this.startingDragPoint_[1]]);
              },this));
        }
        goog.events.listenOnce(this.$document_[0],
            'mouseup', goog.bind(function() {
              this.element_.css({'transform': 'scale(1)'});
              this.startingAnchorPoint_ = null;
              this.startingDragPoint_ = null;

              if (this.mousemoveEvent_) {
                goog.events.unlistenByKey(this.mousemoveEvent_);
              }
              this.mousemoveEvent_ = null;
            },this));
      },this), undefined, this);
};


/**
 * @param {ol.Feature} feature
 * @param {ol.Map} map
 * @param {ol.Coordinate=} opt_anchor
 */
app.FeaturePopup.prototype.show = function(feature, map, opt_anchor) {
  this.scope_['feature'] = feature;
  this.scope_['map'] = map;
  var anchor = goog.isDef(opt_anchor) ? opt_anchor : this.getAnchor(feature);
  this.overlay_.setPosition(anchor);
  var headers = angular.element(this.$document_).
      find('.feature-popup-heading');
  goog.array.forEach(headers, function(element) {
    this.setDraggable(angular.element(element));
  }, this);
  // Enable the dropdown menu
  this.element_.find('[data-toggle=dropdown]')['dropdown']();
};


/**
 */
app.FeaturePopup.prototype.toggleDropdown = function() {
  this.element_.find('[data-toggle=dropdown]')['dropdown']('toggle');
};


/**
 */
app.FeaturePopup.prototype.hide = function() {
  delete this.scope_['feature'];
  delete this.scope_['map'];
  this.overlay_.setPosition(undefined);
  this.features_.clear();
  goog.events.unlistenByKey(this.mousedownEvent_);
  this.mousedownEvent_ = null;
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
