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
goog.provide('app.draw.DrawController');

goog.require('app.module');
goog.require('app.interaction.DrawRoute');
goog.require('app.interaction.ClipLine');
goog.require('app.interaction.ModifyCircle');
goog.require('app.NotifyNotificationType');
goog.require('ngeo.interaction.Measure');
goog.require('ngeo.misc.decorate');
goog.require('ol.CollectionEventType');
goog.require('ol.Feature');
goog.require('ol.Object');
goog.require('ol.Observable');
goog.require('ol.Overlay');
goog.require('ol.events');
goog.require('ol.extent');
goog.require('ol.proj');
goog.require('ol.geom.GeometryType');
goog.require('ol.geom.LineString');
goog.require('ol.geom.Polygon');
goog.require('ol.interaction');
goog.require('ol.interaction.Draw');
goog.require('ol.interaction.Modify');
goog.require('ol.interaction.Select');
goog.require('ol.interaction.Translate');


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
app.draw.DrawController = function($scope,
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

  var drawPoint = new ol.interaction.Draw({
    type: ol.geom.GeometryType.POINT
  });

  /**
   * @type {ol.interaction.Draw}
   * @export
   */
  this.drawPoint = drawPoint;

  drawPoint.setActive(false);
  ngeo.misc.decorate.interaction(drawPoint);
  this.map.addInteraction(drawPoint);
  ol.events.listen(drawPoint, ol.Object.getChangeEventType(
      ol.interaction.Property.ACTIVE),
      this.onChangeActive_, this);
  ol.events.listen(drawPoint, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, this);

  var drawLabel = new ol.interaction.Draw({
    type: ol.geom.GeometryType.POINT
  });

  /**
   * @type {ol.interaction.Draw}
   * @export
   */
  this.drawLabel = drawLabel;

  drawLabel.setActive(false);
  ngeo.misc.decorate.interaction(drawLabel);
  this.map.addInteraction(drawLabel);
  ol.events.listen(drawLabel, ol.Object.getChangeEventType(
      ol.interaction.Property.ACTIVE),
      this.onChangeActive_, this);
  ol.events.listen(drawLabel, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, this);

  this.drawnFeatures_.drawLineInteraction = new app.interaction.DrawRoute({
    type: ol.geom.GeometryType.LINE_STRING,
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
  ngeo.misc.decorate.interaction(this.drawLine);
  this.map.addInteraction(this.drawLine);
  ol.events.listen(this.drawLine, ol.Object.getChangeEventType(
      ol.interaction.Property.ACTIVE),
      this.onChangeActive_, this);
  ol.events.listen(this.drawLine, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, this);
  ol.events.listen(this.drawLine, ol.interaction.DrawEventType.DRAWSTART,
      this.onDrawLineStart_, this);

  var drawPolygon = new ol.interaction.Draw({
    type: ol.geom.GeometryType.POLYGON
  });

  /**
   * @type {ol.interaction.Draw}
   * @export
   */
  this.drawPolygon = drawPolygon;

  drawPolygon.setActive(false);
  ngeo.misc.decorate.interaction(drawPolygon);
  this.map.addInteraction(drawPolygon);
  ol.events.listen(drawPolygon, ol.Object.getChangeEventType(
      ol.interaction.Property.ACTIVE),
      this.onChangeActive_, this);
  ol.events.listen(drawPolygon, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, this);
  ol.events.listen(drawPolygon, ol.interaction.DrawEventType.DRAWSTART,
      this.onDrawPolygonStart_, this);

  var drawCircle = new ol.interaction.Draw({
    type: ol.geom.GeometryType.CIRCLE
  });

  /**
   * @type {ol.interaction.Draw}
   * @export
   */
  this.drawCircle = drawCircle;

  drawCircle.setActive(false);
  ngeo.misc.decorate.interaction(drawCircle);
  this.map.addInteraction(drawCircle);
  ol.events.listen(drawCircle, ol.Object.getChangeEventType(
      ol.interaction.Property.ACTIVE),
      this.onChangeActive_, this);
  ol.events.listen(drawCircle, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, this);
  ol.events.listen(drawCircle, ol.interaction.DrawEventType.DRAWSTART,
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

  var selectInteraction = new ol.interaction.Select({
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

  ol.events.listen(appSelectedFeatures, ol.CollectionEventType.ADD,
      /**
       * @param {ol.Collection.Event} evt The event.
       */
      (function(evt) {
        console.assert(evt.element instanceof ol.Feature);
        var feature = /** @type {ol.Feature} */ (evt.element);
        feature.set('__selected__', true);
        if (this['activateMymaps'] && !this.appGetDevice_.testEnv('xs')) {
          this['mymapsOpen'] = true;
        }
        if (!this.featurePopup_.isDocked) {
          this.featurePopup_.show(feature, this.map,
            ol.extent.getCenter(feature.getGeometry().getExtent()));
        }
        this.gotoAnchor(
            'feature-' + this.drawnFeatures_.getArray().indexOf(feature));
        this.scope_.$applyAsync();
      }).bind(this));

  ol.events.listen(appSelectedFeatures, ol.CollectionEventType.REMOVE,
      /**
       * @param {ol.Collection.Event} evt The event.
       */
      (function(evt) {
        console.assert(evt.element instanceof ol.Feature);
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

  this.drawnFeatures_.modifyInteraction = new ol.interaction.Modify({
    features: appSelectedFeatures,
    pixelTolerance: 20,
    deleteCondition: function(event) {
      return ol.events.condition.noModifierKeys(event) && ol.events.condition.singleClick(event);
    }
  });

  this.drawnFeatures_.clipLineInteraction =
      new app.interaction.ClipLine({
        features: this.drawnFeatures_.getCollection()
      });
  this.drawnFeatures_.clipLineInteraction.setActive(false);
  this.map.addInteraction(this.drawnFeatures_.clipLineInteraction);
  ol.events.listen(this.drawnFeatures_.clipLineInteraction,
      ol.interaction.ModifyEventType.MODIFYEND, this.onClipLineEnd_, this);

  this.drawnFeatures_.modifyCircleInteraction =
      new app.interaction.ModifyCircle({
        features: appSelectedFeatures
      });
  /**
   * @type {app.interaction.ModifyCircle}
   * @private
   */
  this.modifyCircleInteraction_ = this.drawnFeatures_.modifyCircleInteraction;
  this.map.addInteraction(this.drawnFeatures_.modifyCircleInteraction);
  this.modifyCircleInteraction_.setActive(false);
  ol.events.listen(this.modifyCircleInteraction_,
      ol.interaction.ModifyEventType.MODIFYEND, this.onFeatureModifyEnd_, this);

  this.map.addInteraction(this.drawnFeatures_.modifyInteraction);
  ol.events.listen(this.drawnFeatures_.modifyInteraction,
      ol.interaction.ModifyEventType.MODIFYEND, this.onFeatureModifyEnd_, this);

  this.drawnFeatures_.translateInteraction = new ol.interaction.Translate({
    features: appSelectedFeatures
  });
  this.drawnFeatures_.translateInteraction.setActive(false);
  this.map.addInteraction(this.drawnFeatures_.translateInteraction);

  ol.events.listen(
      this.drawnFeatures_.translateInteraction,
      ol.interaction.TranslateEventType.TRANSLATEEND,
      /**
       * @param {ol.interaction.Translate.Event} evt The event.
       */
      (function(evt) {
        this.onFeatureModifyEnd_(evt);
      }), this);

  this.drawnFeatures_.drawFeaturesInUrl(this.featureStyleFunction_);

  ol.events.listen(this.map, ol.events.EventType.KEYDOWN,
      this.keyboardHandler_, this);

};


/**
 * @param {ol.events.Event} event Event.
 * @private
 */
app.draw.DrawController.prototype.onFeatureModifyEnd_ = function(event) {
  this.scope_.$applyAsync(function() {
    var feature = event.features.getArray()[0];
    this.drawnFeatures_.saveFeature(feature);
  }.bind(this));
};

/**
 * @param {ol.interaction.Draw.Event} event Event.
 * @private
 */
app.draw.DrawController.prototype.onContinueLineEnd_ = function(event) {
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
app.draw.DrawController.prototype.onChangeActive_ = function(event) {
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
      this.notify_(msg, app.NotifyNotificationType.INFO);
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
app.draw.DrawController.prototype.onDrawPolygonStart_ = function(event) {
  this.createMeasureTooltip_();
  var sketchFeature = event.feature;
  var geometry = /** @type {ol.geom.Polygon} */
      (sketchFeature.getGeometry());
  console.assert(geometry !== undefined);
  var proj = this.map.getView().getProjection();


  this.changeEventKey_ = ol.events.listen(geometry,
      ol.events.EventType.CHANGE,
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
app.draw.DrawController.prototype.onDrawLineStart_ = function(event) {
  this.createMeasureTooltip_();
  var sketchFeature = event.feature;
  var geometry = /** @type {ol.geom.LineString} */
      (sketchFeature.getGeometry());
  console.assert(geometry !== undefined);
  var proj = this.map.getView().getProjection();

  this.changeEventKey_ = ol.events.listen(geometry,
      ol.events.EventType.CHANGE,
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
app.draw.DrawController.prototype.onDrawCircleStart_ = function(event) {
  this.createMeasureTooltip_();
  var sketchFeature = event.feature;
  var geometry = /** @type {ol.geom.Circle} */ (sketchFeature.getGeometry());

  console.assert(geometry !== undefined);
  var proj = this.map.getView().getProjection();

  this.changeEventKey_ = ol.events.listen(geometry,
      ol.events.EventType.CHANGE,
      function() {
        var coord = geometry.getLastCoordinate();
        var center = geometry.getCenter();
        if (center !== null && coord !== null) {
          var output = this.getFormattedLength(
              new ol.geom.LineString([center, coord]), proj);
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
app.draw.DrawController.prototype.getFormattedLength =
  function(lineString, projection) {
    var length = 0;
    var coordinates = lineString.getCoordinates();
    for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
      var c1 = ol.proj.transform(coordinates[i], projection, 'EPSG:4326');
      var c2 = ol.proj.transform(coordinates[i + 1], projection, 'EPSG:4326');
      length += ngeo.interaction.Measure.SPHERE_WGS84.haversineDistance(c1, c2);
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
app.draw.DrawController.prototype.getFormattedArea = function(polygon, projection) {
  var geom = /** @type {ol.geom.Polygon} */ (
      polygon.clone().transform(projection, 'EPSG:4326'));
  var coordinates = geom.getLinearRing(0).getCoordinates();
  var area = Math.abs(ngeo.interaction.Measure.SPHERE_WGS84.geodesicArea(coordinates));
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
app.draw.DrawController.prototype.onDrawEnd_ = function(event) {
  this.removeMeasureTooltip_();

  if (this.changeEventKey_ !== null) {
    ol.Observable.unByKey(this.changeEventKey_);
    this.changeEventKey_ = null;
  }
  if (this.drawnFeatures_.continuingLine) {
    this.drawnFeatures_.continuingLine = false;
    this.onContinueLineEnd_(event);
    return;
  }
  var feature = event.feature;
  if (feature.getGeometry().getType() === ol.geom.GeometryType.CIRCLE) {
    var featureGeom = /** @type {ol.geom.Circle} */ (feature.getGeometry());
    feature.set('isCircle', true);
    feature.setGeometry(
        ol.geom.Polygon.fromCircle(featureGeom, 64)
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
app.draw.DrawController.prototype.onClipLineEnd_ = function(event) {
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
app.draw.DrawController.prototype.setActiveDraw_ = function(active, interaction) {
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
app.draw.DrawController.prototype.toggleDrawPoint = function() {
  var active = !this.isEditing('drawPoint');
  this.setActiveDraw_(active, this.drawPoint);
  return this.isEditing('drawPoint');
};

/**
 * @return {boolean} true if the feature is active.
 * @export
 */
app.draw.DrawController.prototype.toggleDrawLine = function() {
  var active = !this.isEditing('drawLine');
  this.setActiveDraw_(active, this.drawLine);

  return this.isEditing('drawLine');
};

/**
 * @return {boolean} true if the feature is active.
 * @export
 */
app.draw.DrawController.prototype.toggleMapMatching = function() {
  return this.drawLine.toggleMapMatching();
};

/**
 * @return {boolean} True if mapmatching active.
 * @export
 */
app.draw.DrawController.prototype.getMapMatching = function() {
  return this.drawLine.getMapMatching();
};

/**
 * @return {boolean} true if the feature is active.
 * @export
 */
app.draw.DrawController.prototype.toggleDrawLabel = function() {
  var active = !this.isEditing('drawLabel');
  this.setActiveDraw_(active, this.drawLabel);
  return this.isEditing('drawLabel');
};


/**
 * @return {boolean} true if the feature is active.
 * @export
 */
app.draw.DrawController.prototype.toggleDrawPolygon = function() {
  var active = !this.isEditing('drawPolygon');
  this.setActiveDraw_(active, this.drawPolygon);
  return this.isEditing('drawPolygon');
};


/**
 * @return {boolean} true if the feature is active.
 * @export
 */
app.draw.DrawController.prototype.toggleDrawCircle = function() {
  var active = !this.isEditing('drawCircle');
  this.setActiveDraw_(active, this.drawCircle);
  return this.isEditing('drawCircle');
};


/**
 * @param {string} type The interaction type.
 * @return {boolean} true if the feature is being edited.
 * @export
 */
app.draw.DrawController.prototype.isEditing = function(type) {
  var feature;
  if (this.selectedFeatures_.getLength() > 0) {
    feature = this.selectedFeatures_.getArray()[0];
  }
  if ('drawPoint' === type) {
    if (this.drawPoint.getActive() ||
        (feature !== undefined && feature.get('__editable__') === 1 &&
        !feature.get('isLabel') &&
        feature.getGeometry().getType() === ol.geom.GeometryType.POINT)) {
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
        feature.getGeometry().getType() === ol.geom.GeometryType.LINE_STRING)) {
      return true;
    }
  }
  if ('drawPolygon' === type) {
    if (this.drawPolygon.getActive() ||
        (feature !== undefined && feature.get('__editable__') === 1 &&
        !feature.get('isCircle') &&
        feature.getGeometry().getType() === ol.geom.GeometryType.POLYGON)) {
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
app.draw.DrawController.prototype.createMeasureTooltip_ = function() {
  this.removeMeasureTooltip_();
  this.measureTooltipElement_ = document.createElement('DIV');
  this.measureTooltipElement_.classList.add('tooltip');
  this.measureTooltipElement_.classList.add('ngeo-tooltip-measure');

  this.measureTooltipOverlay_ = new ol.Overlay({
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
app.draw.DrawController.prototype.removeMeasureTooltip_ = function() {
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
app.draw.DrawController.prototype.gotoAnchor = function(anchorId) {
  this.anchorScroll_(anchorId);
};


/**
 * Handle the backspace and escape keys.
 * @param {ol.MapBrowserEvent} mapBrowserEvent Map browser event.
 * @private
 */
app.draw.DrawController.prototype.keyboardHandler_ = function(mapBrowserEvent) {
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

app.module.controller('AppDrawController', app.draw.DrawController);
