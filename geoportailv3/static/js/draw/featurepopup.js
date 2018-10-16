/**
 * @fileoverview Provides a feature popup service.
 */

goog.provide('app.draw.FeaturePopup');

goog.require('app.module');
goog.require('goog.asserts');
goog.require('goog.array');
goog.require('ol.Overlay');
goog.require('ol.Observable');
goog.require('ol.events');
goog.require('ol.geom.LineString');
goog.require('ngeo.interaction.Measure');
goog.require('ol.MapBrowserEventType');
goog.require('ol.geom.GeometryType');
goog.require('ol.geom.Point');
goog.require('ol.geom.Polygon');


/**
 * @param {angular.$compile} $compile The compile provider.
 * @param {angular.Scope} $rootScope The rootScope provider.
 * @param {angular.$injector} $injector Main injector.
 * @param {Document} $document The document.
 * @param {app.GetElevation} appGetElevation The elevation service.
 * @param {app.GetProfile} appGetProfile The profile service.
 * @constructor
 * @ngInject
 */
app.draw.FeaturePopup = function($compile, $rootScope, $injector, $document,
    appGetElevation, appGetProfile) {
  /**
   * @type {ngeox.unitPrefix}
   */
  this.format_ = $injector.get('$filter')('ngeoUnitPrefix');

  /**
   * @type {boolean}
   */
  this.isDocked = true;

  /**
   * @type {Document}
   * @private
   */
  this.$document_ = $document;

  /**
   * @type {ol.Map}
   * @export
   */
  this.map;

  /**
   * @type {app.GetElevation}
   * @private
   */
  this.getElevation_ = appGetElevation;

  /**
   * @type {app.GetProfile}
   * @private
   */
  this.getProfile_ = appGetProfile;

  /**
   * The scope the compiled element is linked to.
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $rootScope.$new(true);

  /**
   * @type {ol.EventsKey?}
   * @private
   */
  this.mousemoveEvent_ = null;

  /**
   * @type {ol.EventsKey?}
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
 */
app.draw.FeaturePopup.prototype.init = function(map) {
  this.map = map;
  this.map.addOverlay(this.overlay_);
};


/**
 * @param {angular.JQLite} element The element.
 */
app.draw.FeaturePopup.prototype.setDraggable = function(element) {
  this.mousedownEvent_ = ol.events.listen(element[0], 'mousedown',
      goog.bind(function(event) {
        this.element_.css({'transform': 'scale(1.1)',
          'transition': 'transform .3s'});
        if (goog.isNull(this.mousemoveEvent_)) {
          this.mousemoveEvent_ = ol.events.listen(this.map,
              ol.MapBrowserEventType.POINTERMOVE, goog.bind(function(e) {
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
              }, this));
        }
        ol.events.listenOnce(this.$document_[0],
            'mouseup', goog.bind(function() {
              this.element_.css({'transform': 'scale(1)'});
              this.startingAnchorPoint_ = null;
              this.startingDragPoint_ = null;

              if (this.mousemoveEvent_) {
                ol.Observable.unByKey(this.mousemoveEvent_);
              }
              this.mousemoveEvent_ = null;
            }, this));
      }, this), this);
};


/**
 * @param {ol.Feature} feature The feature to show.
 * @param {ol.Map} map The current map.
 * @param {ol.Coordinate=} opt_anchor The options.
 */
app.draw.FeaturePopup.prototype.show = function(feature, map, opt_anchor) {
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
  this.element_.find('[data-toggle=dropdown]').dropdown();
};


/**
 */
app.draw.FeaturePopup.prototype.toggleDropdown = function() {
  this.element_.find('[data-toggle=dropdown]').dropdown('toggle');
};


/**
 * @param {ol.Feature} feature The feature.
 */
app.draw.FeaturePopup.prototype.fit = function(feature) {
  var viewSize = /** {ol.Size} **/ (this.map.getSize());
  goog.asserts.assert(goog.isDef(viewSize));
  this.map.getView().fit(feature.getGeometry().getExtent(), {
    size: viewSize
  });
};


/**
 * Hide the overlay.
 */
app.draw.FeaturePopup.prototype.hide = function() {
  delete this.scope_['feature'];
  delete this.scope_['map'];
  this.overlay_.setPosition(undefined);
  ol.Observable.unByKey(this.mousedownEvent_);
  this.mousedownEvent_ = null;
};


/**
 * @param {ol.Feature} feature The feature.
 * @return {?ol.Coordinate} The coordinate for the anchor.
 */
app.draw.FeaturePopup.prototype.getAnchor = function(feature) {
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


/**
 * @param {!ol.geom.Polygon} polygon The polygon.
 * @return {string} The formatted area.
 */
app.draw.FeaturePopup.prototype.formatArea = function(polygon) {
  var projection = this.map.getView().getProjection();
  goog.asserts.assert(projection);
  return ngeo.interaction.Measure.getFormattedArea(
      polygon,
      projection,
      undefined,
      this.format_
  );
};


/**
 * @param {!ol.geom.LineString} line The line.
 * @return {string} The formatted length.
 */
app.draw.FeaturePopup.prototype.formatRadius = function(line) {
  var projection = this.map.getView().getProjection();
  goog.asserts.assert(projection);
  return ngeo.interaction.Measure.getFormattedLength(
      line,
      projection,
      undefined,
      this.format_
  );
};


/**
 * @param {(!ol.geom.LineString|!ol.geom.Polygon)} line The geometry.
 * @return {string} The formatted length.
 */
app.draw.FeaturePopup.prototype.formatLength = function(line) {
  var coordinates = (line.getType() === ol.geom.GeometryType.POLYGON) ?
      line.getCoordinates()[0] : line.getCoordinates();
  var projection = this.map.getView().getProjection();
  goog.asserts.assert(projection);
  return ngeo.interaction.Measure.getFormattedLength(
      new ol.geom.LineString(coordinates),
      projection,
      undefined,
      this.format_
  );
};


/**
 * @param {!ol.geom.Point} point The point.
 * @return {angular.$q.Promise} The promise for the elevation.
 */
app.draw.FeaturePopup.prototype.getElevation = function(point) {
  return this.getElevation_(point.getCoordinates());
};


/**
 * @param {!ol.geom.LineString} linestring The linestring geometry.
 * @return {angular.$q.Promise} The promise for the profile.
 */
app.draw.FeaturePopup.prototype.getProfile = function(linestring) {
  return this.getProfile_(linestring);
};


app.module.service('appFeaturePopup', app.draw.FeaturePopup);
