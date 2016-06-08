/**
 * @fileoverview This file provides a draw directive. This directive is used
 * to create a draw panel in the page.
 *
 * Example:
 *
 * <app-draw app-draw-map="::mainCtrl.map"
 *           app-draw-queryactive="mainCtrl.queryActive"
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
goog.require('goog.asserts');
goog.require('ngeo.DecorateInteraction');
goog.require('ngeo.FeatureOverlayMgr');
goog.require('ngeo.interaction.MeasureArea');
goog.require('ngeo.interaction.MeasureAzimut');
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
      'queryActive': '=appDrawQueryactive',
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
 * @constructor
 * @export
 * @ngInject
 */
app.DrawController = function($scope, ngeoDecorateInteraction,
    ngeoFeatureOverlayMgr, appFeaturePopup, appDrawnFeatures,
    appSelectedFeatures, appMymaps, gettextCatalog, $compile, appNotify) {
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

  var drawCircle = new ngeo.interaction.MeasureAzimut({
    startMsg: $compile('')($scope)[0],
    continueMsg: $compile('')($scope)[0]
  });

  /**
   * @type {ngeo.interaction.MeasureAzimut}
   * @export
   */
  this.drawCircle = drawCircle;

  drawCircle.setActive(false);
  ngeoDecorateInteraction(drawCircle);
  this.map.addInteraction(drawCircle);
  ol.events.listen(drawCircle, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
      this.onChangeActive_, this);
  ol.events.listen(drawCircle, ngeo.MeasureEventType.MEASUREEND,
      /**
       * @param {ngeo.MeasureEvent} event The measure event.
       */
      function(event) {
        // In the case of azimut measure interaction, the feature's geometry is
        // actually a collection (line + circle)
        // For our purpose here, we only need the circle.
        var geometry = /** @type {ol.geom.GeometryCollection} */
            (event.feature.getGeometry());
        event.feature = new ol.Feature(geometry.getGeometries()[1]);
        this.onDrawEnd_(event);
      }, this);

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
      this['queryActive'] = true;
    } else {
      this['queryActive'] = false;
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
        this['queryActive'] = false;
      }, this));

  ol.events.listen(appSelectedFeatures, ol.CollectionEventType.REMOVE,
      /**
       * @param {ol.CollectionEvent} evt The event.
       */
      (function(evt) {
        goog.asserts.assertInstanceof(evt.element, ol.Feature);
        var feature = evt.element;
        feature.set('__selected__', false);
        if (!this.active) {
          this['queryActive'] = true;
        }
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
      this.drawPolygon.getActive() || this.drawCircle.getActive();
  this.selectInteraction_.setActive(!active);
  var msg = '';
  if (this.drawPoint.getActive()) {
    msg = this.gettextCatalog.getString('Click to draw the point');
  } else if (this.drawLine.getActive()) {
    msg = this.gettextCatalog.getString('Click to start drawing line<br>' +
      'Double-click to finish');
  } else if (this.drawPolygon.getActive()) {
    msg = this.gettextCatalog.getString('Click to start drawing polygon<br>' +
      'Double-click or click last point to finish');
  } else if (this.drawCircle.getActive()) {
    msg = this.gettextCatalog.getString('Click to start drawing circle');
  } else if (this.drawLabel.getActive()) {
    msg = this.gettextCatalog.getString('Click to place the label');
  }
  if (msg.length > 0) {
    this.notify_(msg);
  }
};


/**
 * @param {ol.interaction.DrawEvent} event The event.
 * @private
 */
app.DrawController.prototype.onDrawEnd_ = function(event) {
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

app.module.controller('AppDrawController', app.DrawController);
