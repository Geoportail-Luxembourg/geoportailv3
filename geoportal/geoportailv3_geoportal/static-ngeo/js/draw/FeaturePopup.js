/**
 * @module app.draw.FeaturePopup
 */
/**
 * @fileoverview Provides a feature popup service.
 */

import appModule from '../module.js';
import olOverlay from 'ol/Overlay.js';
import olObservable from 'ol/Observable.js';
import {listen} from 'ol/events.js';
import olGeomLineString from 'ol/geom/LineString.js';
import ngeoInteractionMeasure from 'ngeo/interaction/Measure.js';
import olMapBrowserEventType from 'ol/MapBrowserEventType.js';
import olGeomGeometryType from 'ol/geom/GeometryType.js';
import olGeomPoint from 'ol/geom/Point.js';
import olGeomPolygon from 'ol/geom/Polygon.js';

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
const exports = function($compile, $rootScope, $injector, $document,
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
  this.overlay_ = new olOverlay({
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
exports.prototype.init = function(map) {
  this.map = map;
  this.map.addOverlay(this.overlay_);
};


/**
 * @param {angular.JQLite} element The element.
 */
exports.prototype.setDraggable = function(element) {
  this.mousedownEvent_ = listen(element[0], 'mousedown',
      function(event) {
        this.element_.css({'transform': 'scale(1.1)',
          'transition': 'transform .3s'});
        if (this.mousemoveEvent_ !== null) {
          this.mousemoveEvent_ = listen(this.map,
              olMapBrowserEventType.POINTERMOVE, function(e) {
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
              }.bind(this));
        }
        listenOnce(this.$document_[0],
            'mouseup', function() {
              this.element_.css({'transform': 'scale(1)'});
              this.startingAnchorPoint_ = null;
              this.startingDragPoint_ = null;

              if (this.mousemoveEvent_) {
                olObservable.unByKey(this.mousemoveEvent_);
              }
              this.mousemoveEvent_ = null;
            }.bind(this));
      }.bind(this), this);
};


/**
 * @param {ol.Feature} feature The feature to show.
 * @param {ol.Map} map The current map.
 * @param {ol.Coordinate=} opt_anchor The options.
 */
exports.prototype.show = function(feature, map, opt_anchor) {
  this.scope_['feature'] = feature;
  this.scope_['map'] = map;
  var anchor = opt_anchor !== undefined ? opt_anchor : this.getAnchor(feature);
  this.overlay_.setPosition(anchor);

  var headers = angular.element(this.$document_).find('.feature-popup-heading');
  angular.forEach(headers, function(element) {
    this.setDraggable(angular.element(element));
  }, this);
  // Enable the dropdown menu
  this.element_.find('[data-toggle=dropdown]').dropdown();
};


/**
 */
exports.prototype.toggleDropdown = function() {
  this.element_.find('[data-toggle=dropdown]').dropdown('toggle');
};


/**
 * @param {ol.Feature} feature The feature.
 */
exports.prototype.fit = function(feature) {
  var viewSize = /** {ol.Size} **/ (this.map.getSize());
  console.assert(viewSize !== undefined);
  this.map.getView().fit(feature.getGeometry().getExtent(), {
    size: viewSize
  });
};


/**
 * Hide the overlay.
 */
exports.prototype.hide = function() {
  delete this.scope_['feature'];
  delete this.scope_['map'];
  this.overlay_.setPosition(undefined);
  olObservable.unByKey(this.mousedownEvent_);
  this.mousedownEvent_ = null;
};


/**
 * @param {ol.Feature} feature The feature.
 * @return {?ol.Coordinate} The coordinate for the anchor.
 */
exports.prototype.getAnchor = function(feature) {
  var geometry = feature.getGeometry();
  switch (geometry.getType()) {
    case olGeomGeometryType.POINT:
      console.assert(geometry instanceof olGeomPoint,
          'geometry should be an ol.geom.Point');
      return /** @type {ol.geom.Point} */ (geometry).getFlatCoordinates();
    case olGeomGeometryType.LINE_STRING:
      console.assert(geometry instanceof olGeomLineString,
          'geometry should be an ol.geom.LineString');
      return /** @type {ol.geom.LineString} */ (geometry).getFlatMidpoint();
    case olGeomGeometryType.POLYGON:
      console.assert(geometry instanceof olGeomPolygon,
          'geometry should be an ol.geom.Polygon');
      return /** @type {ol.geom.Polygon} */ (geometry).getFlatInteriorPoint();
    default:
      console.assert(false, 'Unsupported geometry type');
      return null;
  }
};


/**
 * @param {!ol.geom.Polygon} polygon The polygon.
 * @return {string} The formatted area.
 */
exports.prototype.formatArea = function(polygon) {
  var projection = this.map.getView().getProjection();
  console.assert(projection !== null);
  return ngeoInteractionMeasure.getFormattedArea(
      polygon,
       /** @type {!ol.proj.Projection} */ (projection),
      undefined,
      this.format_
  );
};


/**
 * @param {!ol.geom.LineString} line The line.
 * @return {string} The formatted length.
 */
exports.prototype.formatRadius = function(line) {
  var projection = this.map.getView().getProjection();
  console.assert(projection !== null);
  return ngeoInteractionMeasure.getFormattedLength(
      line,
      /** @type {!ol.proj.Projection} */ (projection),
      undefined,
      this.format_
  );
};


/**
 * @param {(!ol.geom.LineString|!ol.geom.Polygon)} line The geometry.
 * @return {string} The formatted length.
 */
exports.prototype.formatLength = function(line) {
  var coordinates = (line.getType() === olGeomGeometryType.POLYGON) ?
      line.getCoordinates()[0] : line.getCoordinates();
  var projection = this.map.getView().getProjection();
  console.assert(projection !== null);
  return ngeoInteractionMeasure.getFormattedLength(
      new olGeomLineString(coordinates),
      /** @type {!ol.proj.Projection} */ (projection),
      undefined,
      this.format_
  );
};


/**
 * @param {!ol.geom.Point} point The point.
 * @return {angular.$q.Promise} The promise for the elevation.
 */
exports.prototype.getElevation = function(point) {
  return this.getElevation_(point.getCoordinates());
};


/**
 * @param {!ol.geom.LineString} linestring The linestring geometry.
 * @return {angular.$q.Promise} The promise for the profile.
 */
exports.prototype.getProfile = function(linestring) {
  return this.getProfile_(linestring);
};


appModule.service('appFeaturePopup', exports);


export default exports;
