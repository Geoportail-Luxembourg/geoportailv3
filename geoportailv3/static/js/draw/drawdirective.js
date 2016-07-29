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
goog.provide('app.DrawController');
goog.provide('app.drawDirective');


goog.require('app');
goog.require('app.DrawnFeatures');
goog.require('app.FeaturePopup');
goog.require('app.ModifyCircle');
goog.require('app.Mymaps');
goog.require('app.SelectedFeatures');
goog.require('app.Activetool');
goog.require('goog.asserts');
goog.require('ngeo.DecorateInteraction');
goog.require('ngeo.FeatureOverlayMgr');
goog.require('ol.CollectionEventType');
goog.require('ol.FeatureStyleFunction');
goog.require('ol.events');
goog.require('ol.geom.GeometryType');
goog.require('ol.interaction.Draw');
goog.require('ol.interaction.Modify');
goog.require('ol.interaction.Select');
goog.require('ol.interaction.Translate');
goog.require('ol.style.RegularShape');


/**
 * @param {string} appDrawTemplateUrl Url to draw template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.drawDirective = function(appDrawTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appDrawMap',
      'active': '=appDrawActive',
      'mymapsOpen': '=appDrawMymapsOpen'
    },
    controller: 'AppDrawController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appDrawTemplateUrl
  };
};


app.module.directive('appDraw', app.drawDirective);


/**
 * @param {!angular.Scope} $scope Scope.
 * @param {ngeo.DecorateInteraction} ngeoDecorateInteraction Decorate
 *     interaction service.
 * @param {ngeo.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager.
 * @param {app.FeaturePopup} appFeaturePopup Feature popup service.
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {app.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {angular.$compile} $compile The compile provider.
 * @param {app.Notify} appNotify Notify service.
 * @param {angular.$anchorScroll} $anchorScroll The anchorScroll provider.
 * @param {app.Activetool} appActivetool The activetool service.
 * @constructor
 * @export
 * @ngInject
 */
app.DrawController = function($scope, ngeoDecorateInteraction,
    ngeoFeatureOverlayMgr, appFeaturePopup, appDrawnFeatures,
    appSelectedFeatures, appMymaps, gettextCatalog, $compile, appNotify,
    $anchorScroll, appActivetool) {
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
   * @type {?ol.events.Key}
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
   * @type {app.FeaturePopup}
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
   * @type {app.DrawnFeatures}
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
  ngeoDecorateInteraction(drawPoint);
  this.map.addInteraction(drawPoint);
  ol.events.listen(drawPoint, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
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
  ngeoDecorateInteraction(drawLabel);
  this.map.addInteraction(drawLabel);
  ol.events.listen(drawLabel, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
      this.onChangeActive_, this);
  ol.events.listen(drawLabel, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, this);

  this.drawnFeatures_.drawLineInteraction = new ol.interaction.Draw({
    type: ol.geom.GeometryType.LINE_STRING
  });

  /**
   * @type {ol.interaction.Draw}
   * @export
   */
  this.drawLine = this.drawnFeatures_.drawLineInteraction;

  this.drawLine.setActive(false);
  ngeoDecorateInteraction(this.drawLine);
  this.map.addInteraction(this.drawLine);
  ol.events.listen(this.drawLine, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
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
  ngeoDecorateInteraction(drawPolygon);
  this.map.addInteraction(drawPolygon);
  ol.events.listen(drawPolygon, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
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
  ngeoDecorateInteraction(drawCircle);
  this.map.addInteraction(drawCircle);
  ol.events.listen(drawCircle, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
      this.onChangeActive_, this);
  ol.events.listen(drawCircle, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, this);
  ol.events.listen(drawCircle, ol.interaction.DrawEventType.DRAWSTART,
      this.onDrawCircleStart_, this);

  // Watch the "active" property, and disable the draw interactions
  // when "active" gets set to false.
  $scope.$watch(goog.bind(function() {
    return this.active;
  }, this), goog.bind(function(newVal) {
    if (newVal === false) {
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
      this['mymapsOpen'] = true;
    }
  }, this));

  var selectInteraction = new ol.interaction.Select({
    features: appSelectedFeatures,
    filter: goog.bind(function(feature, layer) {
      return this.drawnFeatures_.getArray().indexOf(feature) != -1;
    }, this)
  });
  this.map.addInteraction(selectInteraction);

  /**
   * @type {ol.interaction.Select}
   * @private
   */
  this.selectInteraction_ = selectInteraction;

  appFeaturePopup.init(this.map, selectInteraction.getFeatures());

  ol.events.listen(appSelectedFeatures, ol.CollectionEventType.ADD,
      goog.bind(
      /**
       * @param {ol.CollectionEvent} evt The event.
       */
      function(evt) {
        goog.asserts.assertInstanceof(evt.element, ol.Feature);
        var feature = evt.element;
        feature.set('__selected__', true);
        this.drawnFeatures_.activateModifyIfNeeded(feature);
        var editable = !feature.get('__map_id__') ||
            this.appMymaps_.isEditable();
        feature.set('__editable__', editable);

        this.gotoAnchor(
            'feature-' + this.drawnFeatures_.getArray().indexOf(feature));
      }, this));

  ol.events.listen(appSelectedFeatures, ol.CollectionEventType.REMOVE,
      /**
       * @param {ol.CollectionEvent} evt The event.
       */
      (function(evt) {
        goog.asserts.assertInstanceof(evt.element, ol.Feature);
        var feature = evt.element;
        feature.set('__selected__', false);
      }).bind(this));

  ol.events.listen(selectInteraction,
      ol.interaction.SelectEventType.SELECT,
      /**
       * @param {ol.interaction.SelectEvent} evt The event.
       */
      function(evt) {
        if (evt.selected.length > 0) {
          var feature = evt.selected[0];
          this.drawnFeatures_.activateModifyIfNeeded(feature);
          this['mymapsOpen'] = true;
          if (!this.featurePopup_.isDocked) {
            this.featurePopup_.show(feature, this.map,
              evt.mapBrowserEvent.coordinate);
          }
        } else {
          if (!this.featurePopup_.isDocked) {
            this.featurePopup_.hide();
          }
        }
        $scope.$apply();
      }, this);

  this.drawnFeatures_.modifyInteraction = new ol.interaction.Modify({
    features: appSelectedFeatures,
    pixelTolerance: 20
  });

  this.drawnFeatures_.modifyCircleInteraction =
      new app.ModifyCircle({
        features: appSelectedFeatures
      });
  /**
   * @type {app.ModifyCircle}
   * @private
   */
  this.modifyCircleInteraction_ = this.drawnFeatures_.modifyCircleInteraction;
  this.map.addInteraction(this.drawnFeatures_.modifyCircleInteraction);
  this.modifyCircleInteraction_.setActive(false);
  ol.events.listen(this.modifyCircleInteraction_,
      ol.ModifyEventType.MODIFYEND, this.onFeatureModifyEnd_, this);

  this.map.addInteraction(this.drawnFeatures_.modifyInteraction);
  ol.events.listen(this.drawnFeatures_.modifyInteraction,
      ol.ModifyEventType.MODIFYEND, this.onFeatureModifyEnd_, this);

  this.drawnFeatures_.translateInteraction = new ol.interaction.Translate({
    features: appSelectedFeatures
  });
  this.map.addInteraction(this.drawnFeatures_.translateInteraction);

  ol.events.listen(
      this.drawnFeatures_.translateInteraction,
      ol.interaction.TranslateEventType.TRANSLATEEND,
      /**
       * @param {ol.interaction.TranslateEvent} evt The event.
       */
      function(evt) {
        this.onFeatureModifyEnd_(evt);
      }, this);

  var drawOverlay = ngeoFeatureOverlayMgr.getFeatureOverlay();
  drawOverlay.setFeatures(this.drawnFeatures_.getCollection());

  this.drawnFeatures_.drawFeaturesInUrl(this.featureStyleFunction_);
};


/**
 * @param {ol.events.Event} event Event.
 * @private
 */
app.DrawController.prototype.onFeatureModifyEnd_ = function(event) {
  this.scope_.$applyAsync(goog.bind(function() {
    var feature = event.features.getArray()[0];
    this.drawnFeatures_.saveFeature(feature);
  }, this));
};


/**
 * @param {ol.interaction.DrawEvent} event Event.
 * @private
 */
app.DrawController.prototype.onContinueLineEnd_ = function(event) {
  // Deactivating asynchronosly to prevent dbl-click to zoom in
  window.setTimeout(goog.bind(function() {
    this.scope_.$apply(function() {
      event.target.setActive(false);
    });
  }, this), 0);

  this.scope_.$applyAsync(goog.bind(function() {
    this.selectedFeatures_.clear();
    this.selectedFeatures_.push(event.feature);
    this.drawnFeatures_.saveFeature(event.feature);
    this.drawnFeatures_.activateModifyIfNeeded(event.feature);
  }, this));
};


/**
 * @param {ol.ObjectEvent} event The event.
 * @private
 */
app.DrawController.prototype.onChangeActive_ = function(event) {
  var active = this.drawPoint.getActive() || this.drawLine.getActive() ||
      this.drawPolygon.getActive() || this.drawCircle.getActive() ||
      this.drawLabel.getActive();
  this.selectInteraction_.setActive(!active);

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
  }
};


/**
 * @param {ol.interaction.DrawEvent} event The event.
 * @private
 */
app.DrawController.prototype.onDrawPolygonStart_ = function(event) {
  this.createMeasureTooltip_();
  var sketchFeature = event.feature;
  var geometry = /** @type {ol.geom.Polygon} */
      (sketchFeature.getGeometry());
  goog.asserts.assert(goog.isDef(geometry));
  var proj = this.map.getView().getProjection();


  this.changeEventKey_ = ol.events.listen(geometry,
      ol.events.EventType.CHANGE,
      function() {
        var verticesCount = geometry.getCoordinates()[0].length;
        var coord = null;
        if (verticesCount > 2) {
          coord = geometry.getInteriorPoint().getCoordinates();
        }
        if (!goog.isNull(coord)) {
          var output = this.getFormattedArea(geometry, proj);
          this.measureTooltipElement_.innerHTML = output;
          this.measureTooltipOverlay_.setPosition(coord);
        }
      }, this);
};


/**
 * @param {ol.interaction.DrawEvent} event The event.
 * @private
 */
app.DrawController.prototype.onDrawLineStart_ = function(event) {
  this.createMeasureTooltip_();
  var sketchFeature = event.feature;
  var geometry = /** @type {ol.geom.LineString} */
      (sketchFeature.getGeometry());
  goog.asserts.assert(goog.isDef(geometry));
  var proj = this.map.getView().getProjection();

  this.changeEventKey_ = ol.events.listen(geometry,
      ol.events.EventType.CHANGE,
      function() {
        var coord = geometry.getLastCoordinate();
        if (!goog.isNull(coord)) {
          var output = this.getFormattedLength(geometry, proj);
          this.measureTooltipElement_.innerHTML = output;
          this.measureTooltipOverlay_.setPosition(coord);
        }
      }, this);
};


/**
 * @param {ol.interaction.DrawEvent} event The event.
 * @private
 */
app.DrawController.prototype.onDrawCircleStart_ = function(event) {
  this.createMeasureTooltip_();
  var sketchFeature = event.feature;
  var geometry = /** @type {ol.geom.Circle} */ (sketchFeature.getGeometry());

  goog.asserts.assert(goog.isDef(geometry));
  var proj = this.map.getView().getProjection();

  this.changeEventKey_ = ol.events.listen(geometry,
      ol.events.EventType.CHANGE,
      function() {
        var coord = geometry.getLastCoordinate();
        var center = geometry.getCenter();
        if (!goog.isNull(center) && !goog.isNull(coord)) {
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
app.DrawController.prototype.getFormattedLength = function(lineString, projection) {
  var length = 0;
  var coordinates = lineString.getCoordinates();
  for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
    var c1 = ol.proj.transform(coordinates[i], projection, 'EPSG:4326');
    var c2 = ol.proj.transform(coordinates[i + 1], projection, 'EPSG:4326');
    length += ol.sphere.WGS84.haversineDistance(c1, c2);
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
app.DrawController.prototype.getFormattedArea = function(polygon, projection) {
  var geom = /** @type {ol.geom.Polygon} */ (
      polygon.clone().transform(projection, 'EPSG:4326'));
  var coordinates = geom.getLinearRing(0).getCoordinates();
  var area = Math.abs(ol.sphere.WGS84.geodesicArea(coordinates));
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
 * @param {ol.interaction.DrawEvent} event The event.
 * @private
 */
app.DrawController.prototype.onDrawEnd_ = function(event) {
  this.removeMeasureTooltip_();
  if (this.changeEventKey_ !== null) {
    ol.Observable.unByKey(this.changeEventKey_);
    this.changeEventKey_ = null;
  }
  if (this.drawnFeatures_.continuingLine) {
    this.drawnFeatures_.continuingLine = false;
    this.onContinueLineEnd_(event);
    return ;
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
      name = this.gettextCatalog.getString('LineString');
      break;
    case 'Polygon':
      if (feature.get('isCircle')) {
        name = this.gettextCatalog.getString('Circle');
      } else {
        name = this.gettextCatalog.getString('Polygon');
      }
      break;
    default:
      name = feature.getGeometry().getType();
      break;
  }
  feature.set('name', name + ' ' +
      (this.drawnFeatures_.getCollection().getLength() + 1));
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

  // Deactivating asynchronosly to prevent dbl-click to zoom in
  window.setTimeout(goog.bind(function() {
    this.scope_.$apply(function() {
      event.target.setActive(false);
    });
  }, this), 0);

  if (this.appMymaps_.isEditable()) {
    feature.set('__map_id__', this.appMymaps_.getMapId());
  } else {
    feature.set('__map_id__', undefined);
  }

  this.drawnFeatures_.getCollection().push(feature);

  this.selectedFeatures_.clear();
  this.selectedFeatures_.push(feature);
  this.drawnFeatures_.saveFeature(feature);
  this['mymapsOpen'] = true;
};


/**
 * Creates a new measure tooltip
 * @private
 */
app.DrawController.prototype.createMeasureTooltip_ = function() {
  this.removeMeasureTooltip_();
  this.measureTooltipElement_ = goog.dom.createDom(goog.dom.TagName.DIV);
  goog.dom.classlist.addAll(this.measureTooltipElement_,
      ['tooltip', 'tooltip-measure']);
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
app.DrawController.prototype.removeMeasureTooltip_ = function() {
  if (!goog.isNull(this.measureTooltipElement_)) {
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
app.DrawController.prototype.gotoAnchor = function(anchorId) {
  this.anchorScroll_(anchorId);
};

app.module.controller('AppDrawController', app.DrawController);
