/**
 * @module app.draw.DrawController
 */
/**
 * @fileoverview This file provides a draw directive. This directive is used
 * to create a draw panel in the page.
 *
 * Example:
 *
 * <app-draw app-draw-map="::mainCtrl.map"
 *           app-draw-active="mainCtrl.drawOpen"></app-draw>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */

import appModule from '../module.js';
import appInteractionDrawRoute from '../interaction/DrawRoute.js';
import appInteractionClipLine from '../interaction/ClipLine.js';
import appInteractionModifyCircle from '../interaction/ModifyCircle.js';
import appNotifyNotificationType from '../NotifyNotificationType.js';
import ngeoInteractionMeasure from 'ngeo/interaction/Measure.js';
import ngeoMiscDecorate from 'ngeo/misc/decorate.js';
import olCollectionEventType from 'ol/CollectionEventType.js';
import olFeature from 'ol/Feature.js';
import olObject from 'ol/Object.js';
import olObservable from 'ol/Observable.js';
import olOverlay from 'ol/Overlay.js';
import olEvents from 'ol/events.js';
import olExtent from 'ol/extent.js';
import olProj from 'ol/proj.js';
import olGeomGeometryType from 'ol/geom/GeometryType.js';
import olGeomLineString from 'ol/geom/LineString.js';
import olGeomPolygon from 'ol/geom/Polygon.js';
import olInteraction from 'ol/interaction.js';
import olInteractionDraw from 'ol/interaction/Draw.js';
import olInteractionModify from 'ol/interaction/Modify.js';
import olInteractionSelect from 'ol/interaction/Select.js';
import olInteractionTranslate from 'ol/interaction/Translate.js';

/**
 * @param {!angular.Scope} $scope Scope.
 * @param {app.draw.FeaturePopup} appFeaturePopup Feature popup service.
 * @param {app.draw.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {app.draw.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {angular.$compile} $compile The compile provider.
 * @param {app.Notify} appNotify Notify service.
 * @param {angular.$anchorScroll} $anchorScroll The anchorScroll provider.
 * @param {app.Activetool} appActivetool The activetool service.
 * @param {app.GetDevice} appGetDevice The device service.
 * @param {angular.$http} $http Angular $http service.
 * @param {string} getRouteUrl The url.
 * @constructor
 * @export
 * @ngInject
 */
const exports = function($scope,
    appFeaturePopup, appDrawnFeatures, appSelectedFeatures,
    appMymaps, gettextCatalog, $compile, appNotify, $anchorScroll,
    appActivetool, appGetDevice, $http, getRouteUrl) {
  /**
   * @type {string}
   * @private
   */
  this.getRouteUrl_ = getRouteUrl;

  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

  /**
   * @private
   * @type {app.GetDevice}
   */
  this.appGetDevice_ = appGetDevice;

  /**
   * @type {app.Activetool}
   * @private
   */
  this.appActivetool_ = appActivetool;

  /**
   * @type {angular.$anchorScroll}
   * @private
   */
  this.anchorScroll_ = $anchorScroll;

  /**
   * The key for geometry change event.
   * @type {?ol.EventsKey}
   * @private
   */
  this.changeEventKey_ = null;

  /**
   * The measure tooltip element.
   * @type {Element}
   * @private
   */
  this.measureTooltipElement_ = null;

  /**
   * Overlay to show the measurement.
   * @type {ol.Overlay}
   * @private
   */
  this.measureTooltipOverlay_ = null;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * @type {app.draw.FeaturePopup}
   * @private
   */
  this.featurePopup_ = appFeaturePopup;

  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

  /**
   * @type {ol.Map}
   * @export
   */
  this.map;

  /**
   * @type {boolean}
   * @export
   */
  this.active;

  /**
   * @type {boolean}
   * @export
   */
  this.drawPointActive = false;

  /**
   * @type {boolean}
   * @export
   */
  this.drawLabelActive = false;

  /**
   * @type {boolean}
   * @export
   */
  this.drawLineActive = false;

  /**
   * @type {boolean}
   * @export
   */
  this.mapmatchingActive = false;

  /**
   * @type {boolean}
   * @export
   */
  this.showMapMatchingButton = false;

  /**
   * @type {boolean}
   * @export
   */
  this.drawPolygonActive = false;

  /**
   * @type {boolean}
   * @export
   */
  this.drawCircleActive = false;

  /**
   * @type {app.draw.DrawnFeatures}
   * @private
   */
  this.drawnFeatures_ = appDrawnFeatures;

  /**
   * @type {ol.Collection<ol.Feature>}
   * @private
   */
  this.selectedFeatures_ = appSelectedFeatures;

  /**
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

  /**
   * @type {ol.FeatureStyleFunction}
   * @private
   */
  this.featureStyleFunction_ = this.appMymaps_.createStyleFunction(this.map);

  var drawPoint = new olInteractionDraw({
    type: olGeomGeometryType.POINT
  });

  /**
   * @type {ol.interaction.Draw}
   * @export
   */
  this.drawPoint = drawPoint;

  drawPoint.setActive(false);
  ngeoMiscDecorate.interaction(drawPoint);
  this.map.addInteraction(drawPoint);
  olEvents.listen(drawPoint, olObject.getChangeEventType(
      olInteraction.Property.ACTIVE),
      this.onChangeActive_, this);
  olEvents.listen(drawPoint, olInteraction.DrawEventType.DRAWEND,
      this.onDrawEnd_, this);

  var drawLabel = new olInteractionDraw({
    type: olGeomGeometryType.POINT
  });

  /**
   * @type {ol.interaction.Draw}
   * @export
   */
  this.drawLabel = drawLabel;

  drawLabel.setActive(false);
  ngeoMiscDecorate.interaction(drawLabel);
  this.map.addInteraction(drawLabel);
  olEvents.listen(drawLabel, olObject.getChangeEventType(
      olInteraction.Property.ACTIVE),
      this.onChangeActive_, this);
  olEvents.listen(drawLabel, olInteraction.DrawEventType.DRAWEND,
      this.onDrawEnd_, this);

  this.drawnFeatures_.drawLineInteraction = new appInteractionDrawRoute({
    type: olGeomGeometryType.LINE_STRING,
    getRouteUrl: this.getRouteUrl_,
    $http: this.$http_,
    mapMatching: false
  });

  /**
   * @type {app.interaction.DrawRoute}
   * @export
   */
  this.drawLine = this.drawnFeatures_.drawLineInteraction;

  this.drawLine.setActive(false);
  ngeoMiscDecorate.interaction(this.drawLine);
  this.map.addInteraction(this.drawLine);
  olEvents.listen(this.drawLine, olObject.getChangeEventType(
      olInteraction.Property.ACTIVE),
      this.onChangeActive_, this);
  olEvents.listen(this.drawLine, olInteraction.DrawEventType.DRAWEND,
      this.onDrawEnd_, this);
  olEvents.listen(this.drawLine, olInteraction.DrawEventType.DRAWSTART,
      this.onDrawLineStart_, this);

  var drawPolygon = new olInteractionDraw({
    type: olGeomGeometryType.POLYGON
  });

  /**
   * @type {ol.interaction.Draw}
   * @export
   */
  this.drawPolygon = drawPolygon;

  drawPolygon.setActive(false);
  ngeoMiscDecorate.interaction(drawPolygon);
  this.map.addInteraction(drawPolygon);
  olEvents.listen(drawPolygon, olObject.getChangeEventType(
      olInteraction.Property.ACTIVE),
      this.onChangeActive_, this);
  olEvents.listen(drawPolygon, olInteraction.DrawEventType.DRAWEND,
      this.onDrawEnd_, this);
  olEvents.listen(drawPolygon, olInteraction.DrawEventType.DRAWSTART,
      this.onDrawPolygonStart_, this);

  var drawCircle = new olInteractionDraw({
    type: olGeomGeometryType.CIRCLE
  });

  /**
   * @type {ol.interaction.Draw}
   * @export
   */
  this.drawCircle = drawCircle;

  drawCircle.setActive(false);
  ngeoMiscDecorate.interaction(drawCircle);
  this.map.addInteraction(drawCircle);
  olEvents.listen(drawCircle, olObject.getChangeEventType(
      olInteraction.Property.ACTIVE),
      this.onChangeActive_, this);
  olEvents.listen(drawCircle, olInteraction.DrawEventType.DRAWEND,
      this.onDrawEnd_, this);
  olEvents.listen(drawCircle, olInteraction.DrawEventType.DRAWSTART,
      this.onDrawCircleStart_, this);

  // Watch the "active" property, and disable the draw interactions
  // when "active" gets set to false.
  $scope.$watch(function() {
    return this.active;
  }.bind(this), function(newVal) {
    if (newVal === false) {
      if (this.selectedFeatures_.getLength() > 0) {
        var feature = this.selectedFeatures_.getArray()[0];
        feature.set('__editable__', false);
      }
      this.drawPoint.setActive(false);
      this.drawLabel.setActive(false);
      this.drawLine.setActive(false);
      this.drawPolygon.setActive(false);
      this.drawCircle.setActive(false);
      this.drawnFeatures_.modifyCircleInteraction.setActive(false);
      this.drawnFeatures_.modifyInteraction.setActive(false);
      this.appActivetool_.drawActive = false;
    } else {
      this.appActivetool_.drawActive = false;
      if (this['activateMymaps'] && !this.appGetDevice_.testEnv('xs')) {
        this['mymapsOpen'] = true;
      }
    }
  }.bind(this));

  var selectInteraction = new olInteractionSelect({
    features: appSelectedFeatures,
    hitTolerance: 20,
    filter: function(feature, layer) {
      return this.drawnFeatures_.getArray().indexOf(feature) != -1;
    }.bind(this)
  });
  this.map.addInteraction(selectInteraction);

  this.drawnFeatures_.selectInteraction = selectInteraction;
  this.drawnFeatures_.selectInteraction.setActive(false);
  appFeaturePopup.init(this.map);

  olEvents.listen(appSelectedFeatures, olCollectionEventType.ADD,
      /**
       * @param {ol.Collection.Event} evt The event.
       */
      (function(evt) {
        console.assert(evt.element instanceof olFeature);
        var feature = /** @type {ol.Feature} */ (evt.element);
        feature.set('__selected__', true);
        if (this['activateMymaps'] && !this.appGetDevice_.testEnv('xs')) {
          this['mymapsOpen'] = true;
        }
        if (!this.featurePopup_.isDocked) {
          this.featurePopup_.show(feature, this.map,
            olExtent.getCenter(feature.getGeometry().getExtent()));
        }
        this.gotoAnchor(
            'feature-' + this.drawnFeatures_.getArray().indexOf(feature));
        this.scope_.$applyAsync();
      }).bind(this));

  olEvents.listen(appSelectedFeatures, olCollectionEventType.REMOVE,
      /**
       * @param {ol.Collection.Event} evt The event.
       */
      (function(evt) {
        console.assert(evt.element instanceof olFeature);
        var feature = evt.element;
        feature.set('__selected__', false);
        feature.set('__editable__', false);
        this.drawnFeatures_.modifyCircleInteraction.setActive(false);
        this.drawnFeatures_.modifyInteraction.setActive(false);
        this.drawnFeatures_.translateInteraction.setActive(false);
        if (!this.featurePopup_.isDocked) {
          this.featurePopup_.hide();
        }
        this.scope_.$applyAsync();
      }), this);

  this.drawnFeatures_.modifyInteraction = new olInteractionModify({
    features: appSelectedFeatures,
    pixelTolerance: 20,
    deleteCondition: function(event) {
      return olEvents.condition.noModifierKeys(event) && olEvents.condition.singleClick(event);
    }
  });

  this.drawnFeatures_.clipLineInteraction =
      new appInteractionClipLine({
        features: this.drawnFeatures_.getCollection()
      });
  this.drawnFeatures_.clipLineInteraction.setActive(false);
  this.map.addInteraction(this.drawnFeatures_.clipLineInteraction);
  olEvents.listen(this.drawnFeatures_.clipLineInteraction,
      olInteraction.ModifyEventType.MODIFYEND, this.onClipLineEnd_, this);

  this.drawnFeatures_.modifyCircleInteraction =
      new appInteractionModifyCircle({
        features: appSelectedFeatures
      });
  /**
   * @type {app.interaction.ModifyCircle}
   * @private
   */
  this.modifyCircleInteraction_ = this.drawnFeatures_.modifyCircleInteraction;
  this.map.addInteraction(this.drawnFeatures_.modifyCircleInteraction);
  this.modifyCircleInteraction_.setActive(false);
  olEvents.listen(this.modifyCircleInteraction_,
      olInteraction.ModifyEventType.MODIFYEND, this.onFeatureModifyEnd_, this);

  this.map.addInteraction(this.drawnFeatures_.modifyInteraction);
  olEvents.listen(this.drawnFeatures_.modifyInteraction,
      olInteraction.ModifyEventType.MODIFYEND, this.onFeatureModifyEnd_, this);

  this.drawnFeatures_.translateInteraction = new olInteractionTranslate({
    features: appSelectedFeatures
  });
  this.drawnFeatures_.translateInteraction.setActive(false);
  this.map.addInteraction(this.drawnFeatures_.translateInteraction);

  olEvents.listen(
      this.drawnFeatures_.translateInteraction,
      olInteraction.TranslateEventType.TRANSLATEEND,
      /**
       * @param {ol.interaction.Translate.Event} evt The event.
       */
      (function(evt) {
        this.onFeatureModifyEnd_(evt);
      }), this);

  this.drawnFeatures_.drawFeaturesInUrl(this.featureStyleFunction_);

  olEvents.listen(this.map, olEvents.EventType.KEYDOWN,
      this.keyboardHandler_, this);

};


/**
 * @param {ol.events.Event} event Event.
 * @private
 */
exports.prototype.onFeatureModifyEnd_ = function(event) {
  this.scope_.$applyAsync(function() {
    var feature = event.features.getArray()[0];
    this.drawnFeatures_.saveFeature(feature);
  }.bind(this));
};

/**
 * @param {ol.interaction.Draw.Event} event Event.
 * @private
 */
exports.prototype.onContinueLineEnd_ = function(event) {
  // Deactivating asynchronosly to prevent dbl-click to zoom in
  window.setTimeout(function() {
    this.scope_.$apply(function() {
      event.target.setActive(false);
    });
  }.bind(this), 0);

  this.scope_.$applyAsync(function() {
    this.selectedFeatures_.clear();
    this.selectedFeatures_.push(event.feature);
    this.drawnFeatures_.saveFeature(event.feature);
    this.drawnFeatures_.activateModifyIfNeeded(event.feature);
  }.bind(this));
};


/**
 * @param {ol.Object.Event} event The event.
 * @private
 */
exports.prototype.onChangeActive_ = function(event) {
  var active = this.drawPoint.getActive() || this.drawLine.getActive() ||
      this.drawPolygon.getActive() || this.drawCircle.getActive() ||
      this.drawLabel.getActive();
  this.drawnFeatures_.selectInteraction.setActive(false);
  if (active) {
    this.appActivetool_.drawActive = true;
    var msg = '';
    var cntActive = 0;
    if (this.drawPoint.getActive()) {
      msg = this.gettextCatalog.getString('Click to draw the point');
      cntActive++;
    }
    if (this.drawLine.getActive()) {
      msg = this.gettextCatalog.getString('Click to start drawing line<br>' +
        'Double-click to finish');
      cntActive++;
    }
    if (this.drawPolygon.getActive()) {
      msg = this.gettextCatalog.getString('Click to start drawing polygon<br>' +
        'Double-click or click last point to finish');
      cntActive++;
    }
    if (this.drawCircle.getActive()) {
      msg = this.gettextCatalog.getString('Click to start drawing circle');
      cntActive++;
    }
    if (this.drawLabel.getActive()) {
      msg = this.gettextCatalog.getString('Click to place the label');
      cntActive++;
    }
    if (cntActive === 1) {
      this.notify_(msg, appNotifyNotificationType.INFO);
    }
  } else {
    this.appActivetool_.drawActive = false;
    this.drawnFeatures_.selectInteraction.setActive(false);
  }
  if (this.drawLine.getActive()) {
    this.showMapMatchingButton = true;
  } else {
    this.showMapMatchingButton = false;
  }
};


/**
 * @param {ol.interaction.Draw.Event} event The event.
 * @private
 */
exports.prototype.onDrawPolygonStart_ = function(event) {
  this.createMeasureTooltip_();
  var sketchFeature = event.feature;
  var geometry = /** @type {ol.geom.Polygon} */
      (sketchFeature.getGeometry());
  console.assert(geometry !== undefined);
  var proj = this.map.getView().getProjection();


  this.changeEventKey_ = olEvents.listen(geometry,
      olEvents.EventType.CHANGE,
      function() {
        var verticesCount = geometry.getCoordinates()[0].length;
        var coord = null;
        if (verticesCount > 2) {
          coord = geometry.getInteriorPoint().getCoordinates();
        }
        if (coord !== null) {
          var output = this.getFormattedArea(geometry, proj);
          this.measureTooltipElement_.innerHTML = output;
          this.measureTooltipOverlay_.setPosition(coord);
        }
      }, this);
};


/**
 * @param {ol.interaction.Draw.Event} event The event.
 * @private
 */
exports.prototype.onDrawLineStart_ = function(event) {
  this.createMeasureTooltip_();
  var sketchFeature = event.feature;
  var geometry = /** @type {ol.geom.LineString} */
      (sketchFeature.getGeometry());
  console.assert(geometry !== undefined);
  var proj = this.map.getView().getProjection();

  this.changeEventKey_ = olEvents.listen(geometry,
      olEvents.EventType.CHANGE,
      function() {
        var coord = geometry.getLastCoordinate();
        if (coord !== null) {
          var output = this.getFormattedLength(geometry, proj);
          this.measureTooltipElement_.innerHTML = output;
          this.measureTooltipOverlay_.setPosition(coord);
        }
      }, this);
};


/**
 * @param {ol.interaction.Draw.Event} event The event.
 * @private
 */
exports.prototype.onDrawCircleStart_ = function(event) {
  this.createMeasureTooltip_();
  var sketchFeature = event.feature;
  var geometry = /** @type {ol.geom.Circle} */ (sketchFeature.getGeometry());

  console.assert(geometry !== undefined);
  var proj = this.map.getView().getProjection();

  this.changeEventKey_ = olEvents.listen(geometry,
      olEvents.EventType.CHANGE,
      function() {
        var coord = geometry.getLastCoordinate();
        var center = geometry.getCenter();
        if (center !== null && coord !== null) {
          var output = this.getFormattedLength(
              new olGeomLineString([center, coord]), proj);
          this.measureTooltipElement_.innerHTML = output;
          this.measureTooltipOverlay_.setPosition(coord);
        }
      }, this);
};


/**
 * Calculate the length of the passed line string and return a formatted
 * string of the length.
 * @param {ol.geom.LineString} lineString Line string.
 * @param {ol.proj.Projection} projection Projection of the line string coords.
 * @return {string} Formatted string of length.
 */
exports.prototype.getFormattedLength =
  function(lineString, projection) {
    var length = 0;
    var coordinates = lineString.getCoordinates();
    for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
      var c1 = olProj.transform(coordinates[i], projection, 'EPSG:4326');
      var c2 = olProj.transform(coordinates[i + 1], projection, 'EPSG:4326');
      length += ngeoInteractionMeasure.SPHERE_WGS84.haversineDistance(c1, c2);
    }
    var output;
    if (length > 1000) {
      output = parseFloat((length / 1000).toPrecision(3)) +
      ' ' + 'km';
    } else {
      output = parseFloat(length.toPrecision(3)) +
      ' ' + 'm';
    }
    return output;
  };


/**
 * Calculate the area of the passed polygon and return a formatted string
 * of the area.
 * @param {ol.geom.Polygon} polygon Polygon.
 * @param {ol.proj.Projection} projection Projection of the polygon coords.
 * @return {string} Formatted string of the area.
 */
exports.prototype.getFormattedArea = function(polygon, projection) {
  var geom = /** @type {ol.geom.Polygon} */ (
      polygon.clone().transform(projection, 'EPSG:4326'));
  var coordinates = geom.getLinearRing(0).getCoordinates();
  var area = Math.abs(ngeoInteractionMeasure.SPHERE_WGS84.geodesicArea(coordinates));
  var output;
  if (area > 1000000) {
    output = parseFloat((area / 1000000).toPrecision(3)) +
        ' ' + 'km<sup>2</sup>';
  } else {
    output = parseFloat(area.toPrecision(3)) + ' ' + 'm<sup>2</sup>';
  }
  return output;
};


/**
 * @param {ol.interaction.Draw.Event} event The event.
 * @private
 */
exports.prototype.onDrawEnd_ = function(event) {
  this.removeMeasureTooltip_();

  if (this.changeEventKey_ !== null) {
    olObservable.unByKey(this.changeEventKey_);
    this.changeEventKey_ = null;
  }
  if (this.drawnFeatures_.continuingLine) {
    this.drawnFeatures_.continuingLine = false;
    this.onContinueLineEnd_(event);
    return;
  }
  var feature = event.feature;
  if (feature.getGeometry().getType() === olGeomGeometryType.CIRCLE) {
    var featureGeom = /** @type {ol.geom.Circle} */ (feature.getGeometry());
    feature.set('isCircle', true);
    feature.setGeometry(
        olGeomPolygon.fromCircle(featureGeom, 64)
    );
  }

  /**
   * @type {string}
   */
  var name;
  switch (feature.getGeometry().getType()) {
    case 'Point':
      if (this.drawLabel.getActive()) {
        name = this.gettextCatalog.getString('Label');
      } else {
        name = this.gettextCatalog.getString('Point');
      }
      break;
    case 'LineString':
      var curLineStringGeom = /** @type {ol.geom.LineString} */ (feature.getGeometry());
      var curLineStringCooridnates = curLineStringGeom.getCoordinates();
      if (curLineStringCooridnates.length < 2) {
        return;
      }
      var prevCoord = curLineStringCooridnates[curLineStringCooridnates.length - 1];
      var antePrevCoord = curLineStringCooridnates[curLineStringCooridnates.length - 2];
      if (prevCoord[0] === antePrevCoord[0] &&
          prevCoord[1] === antePrevCoord[1]) {
        curLineStringCooridnates.pop();
        if (curLineStringCooridnates.length < 2) {
          return;
        }
        curLineStringGeom.setCoordinates(curLineStringCooridnates);
      }
      name = this.gettextCatalog.getString('LineString');
      break;
    case 'Polygon':
      if (feature.get('isCircle')) {
        name = this.gettextCatalog.getString('Circle');
      } else {
        if (/** @type {ol.geom.Polygon} */ (feature.getGeometry()).getLinearRing(0).getCoordinates().length < 4) {
          return;
        }
        name = this.gettextCatalog.getString('Polygon');
      }
      break;
    default:
      name = feature.getGeometry().getType();
      break;
  }
  var nbFeatures = this.drawnFeatures_.getCollection().getLength();
  feature.set('name', name + ' ' +
      (nbFeatures + 1));
  feature.set('description', '');
  feature.set('__editable__', true);
  feature.set('color', '#ed1c24');
  feature.set('opacity', 0.2);
  feature.set('stroke', 1.25);
  feature.set('size', 10);
  feature.set('angle', 0);
  feature.set('linestyle', 'plain');
  feature.set('shape', 'circle');
  feature.set('isLabel', this.drawLabel.getActive());
  feature.setStyle(this.featureStyleFunction_);
  feature.set('display_order', nbFeatures);


  // Deactivating asynchronosly to prevent dbl-click to zoom in
  window.setTimeout(function() {
    this.scope_.$apply(function() {
      event.target.setActive(false);
    });
  }.bind(this), 0);
  if (this.appMymaps_.isEditable()) {
    feature.set('__map_id__', this.appMymaps_.getMapId());
  } else {
    feature.set('__map_id__', undefined);
  }
  this.drawnFeatures_.getCollection().push(feature);

  feature.set('__refreshProfile__', true);

  this.selectedFeatures_.clear();
  this.selectedFeatures_.push(feature);
  this.drawnFeatures_.saveFeature(feature);
  this.drawnFeatures_.activateModifyIfNeeded(event.feature);
  if (this['activateMymaps'] && !this.appGetDevice_.testEnv('xs')) {
    this['mymapsOpen'] = true;
  }
};


/**
 * @param {ol.interaction.Modify.Event} event The event.
 * @private
 */
exports.prototype.onClipLineEnd_ = function(event) {
  var features = event.features.getArray();

  if (this.appMymaps_.isEditable()) {
    features[0].set('__map_id__', this.appMymaps_.getMapId());
    features[1].set('__map_id__', this.appMymaps_.getMapId());
  } else {
    features[0].set('__map_id__', undefined);
    features[1].set('__map_id__', undefined);
  }
  this.drawnFeatures_.remove(features[2]);
  features[0].set('fid', undefined);
  features[1].set('fid', undefined);
  features[0].set('__selected__', undefined);
  features[1].set('__selected__', undefined);
  this.selectedFeatures_.clear();
  this.drawnFeatures_.saveFeature(features[0]);
  this.drawnFeatures_.saveFeature(features[1]);
  if (this['activateMymaps'] && !this.appGetDevice_.testEnv('xs')) {
    this['mymapsOpen'] = true;
  }
  this.drawnFeatures_.clipLineInteraction.setActive(false);
};


/**
 * @param {boolean} active Set active or not.
 * @param {ol.interaction.Draw | app.interaction.DrawRoute} interaction Set active or not.
 * @private
 */
exports.prototype.setActiveDraw_ = function(active, interaction) {
  if (this.selectedFeatures_.getLength() > 0) {
    var feature = this.selectedFeatures_.getArray()[0];
    feature.set('__editable__', false);
  }
  this.drawnFeatures_.modifyInteraction.setActive(false);
  this.drawnFeatures_.modifyCircleInteraction.setActive(false);
  this.drawnFeatures_.translateInteraction.setActive(false);
  this.drawPoint.setActive(false);
  this.drawLabel.setActive(false);
  this.drawCircle.setActive(false);
  this.drawPolygon.setActive(false);
  this.drawLine.setActive(false);
  if (!active) {
    interaction.setActive(false);
  } else {
    interaction.setActive(true);
  }
};


/**
 * @return {boolean} true if the feature is active.
 * @export
 */
exports.prototype.toggleDrawPoint = function() {
  var active = !this.isEditing('drawPoint');
  this.setActiveDraw_(active, this.drawPoint);
  return this.isEditing('drawPoint');
};

/**
 * @return {boolean} true if the feature is active.
 * @export
 */
exports.prototype.toggleDrawLine = function() {
  var active = !this.isEditing('drawLine');
  this.setActiveDraw_(active, this.drawLine);

  return this.isEditing('drawLine');
};

/**
 * @return {boolean} true if the feature is active.
 * @export
 */
exports.prototype.toggleMapMatching = function() {
  return this.drawLine.toggleMapMatching();
};

/**
 * @return {boolean} True if mapmatching active.
 * @export
 */
exports.prototype.getMapMatching = function() {
  return this.drawLine.getMapMatching();
};

/**
 * @return {boolean} true if the feature is active.
 * @export
 */
exports.prototype.toggleDrawLabel = function() {
  var active = !this.isEditing('drawLabel');
  this.setActiveDraw_(active, this.drawLabel);
  return this.isEditing('drawLabel');
};


/**
 * @return {boolean} true if the feature is active.
 * @export
 */
exports.prototype.toggleDrawPolygon = function() {
  var active = !this.isEditing('drawPolygon');
  this.setActiveDraw_(active, this.drawPolygon);
  return this.isEditing('drawPolygon');
};


/**
 * @return {boolean} true if the feature is active.
 * @export
 */
exports.prototype.toggleDrawCircle = function() {
  var active = !this.isEditing('drawCircle');
  this.setActiveDraw_(active, this.drawCircle);
  return this.isEditing('drawCircle');
};


/**
 * @param {string} type The interaction type.
 * @return {boolean} true if the feature is being edited.
 * @export
 */
exports.prototype.isEditing = function(type) {
  var feature;
  if (this.selectedFeatures_.getLength() > 0) {
    feature = this.selectedFeatures_.getArray()[0];
  }
  if ('drawPoint' === type) {
    if (this.drawPoint.getActive() ||
        (feature !== undefined && feature.get('__editable__') === 1 &&
        !feature.get('isLabel') &&
        feature.getGeometry().getType() === olGeomGeometryType.POINT)) {
      return true;
    }
  }
  if ('drawLabel' === type) {
    if (this.drawLabel.getActive() ||
        (feature !== undefined && feature.get('__editable__') === 1 &&
        !!feature.get('isLabel'))) {
      return true;
    }
  }
  if ('drawLine' === type) {
    if (this.drawLine.getActive() ||
        (feature !== undefined && feature.get('__editable__') === 1 &&
        feature.getGeometry().getType() === olGeomGeometryType.LINE_STRING)) {
      return true;
    }
  }
  if ('drawPolygon' === type) {
    if (this.drawPolygon.getActive() ||
        (feature !== undefined && feature.get('__editable__') === 1 &&
        !feature.get('isCircle') &&
        feature.getGeometry().getType() === olGeomGeometryType.POLYGON)) {
      return true;
    }
  }
  if ('drawCircle' === type) {
    if (this.drawCircle.getActive() ||
        (feature !== undefined && feature.get('__editable__') === 1 &&
        !!feature.get('isCircle'))) {
      return true;
    }
  }
  return false;
};


/**
 * Creates a new measure tooltip
 * @private
 */
exports.prototype.createMeasureTooltip_ = function() {
  this.removeMeasureTooltip_();
  this.measureTooltipElement_ = document.createElement('DIV');
  this.measureTooltipElement_.classList.add('tooltip');
  this.measureTooltipElement_.classList.add('ngeo-tooltip-measure');

  this.measureTooltipOverlay_ = new olOverlay({
    element: this.measureTooltipElement_,
    offset: [0, -15],
    positioning: 'bottom-center',
    stopEvent: false
  });
  this.map.addOverlay(this.measureTooltipOverlay_);
};


/**
 * Destroy the help tooltip
 * @private
 */
exports.prototype.removeMeasureTooltip_ = function() {
  if (this.measureTooltipElement_ !== null) {
    this.measureTooltipElement_.parentNode.removeChild(
        this.measureTooltipElement_);
    this.measureTooltipElement_ = null;
    this.measureTooltipOverlay_ = null;
  }
};


/**
 * Goto the specfied anchor.
 * @param {string} anchorId The id of the anchor.
 * @export
 */
exports.prototype.gotoAnchor = function(anchorId) {
  this.anchorScroll_(anchorId);
};


/**
 * Handle the backspace and escape keys.
 * @param {ol.MapBrowserEvent} mapBrowserEvent Map browser event.
 * @private
 */
exports.prototype.keyboardHandler_ = function(mapBrowserEvent) {
  var keyEvent = mapBrowserEvent.originalEvent;
  var prevent = false;
  if (this.appActivetool_.streetviewActive &&
      document.activeElement.tagName !== 'INPUT') {
    prevent = true;
  }
  if (this.active && keyEvent.key === 'Backspace') {
    if (this.drawLine.getActive()) {
      this.drawLine.removeLastPoints();
      prevent = true;
    }
    if (this.drawPolygon.getActive()) {
      this.drawPolygon.removeLastPoint();
      prevent = true;
    }
  }
  if (this.active && keyEvent.key === 'Escape') {
    if (this.drawLine.getActive()) {
      this.drawLine.finishDrawing();
      prevent = true;
    }
    if (this.drawPolygon.getActive()) {
      this.drawPolygon.finishDrawing();
      prevent = true;
    }
    if (this.drawCircle.getActive()) {
      this.drawCircle.finishDrawing();
      prevent = true;
    }
  }
  if (prevent) {
    mapBrowserEvent.preventDefault();
  }
};

appModule.controller('AppDrawController', exports);


export default exports;
