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
goog.require('app.Mymaps');
goog.require('app.SelectedFeatures');
goog.require('goog.asserts');
goog.require('ngeo.DecorateInteraction');
goog.require('ngeo.FeatureOverlayMgr');
goog.require('ngeo.interaction.MeasureArea');
goog.require('ngeo.interaction.MeasureAzimut');
goog.require('ngeo.interaction.MeasureLength');
goog.require('ol.CollectionEventType');
goog.require('ol.FeatureStyleFunction');
goog.require('ol.events.condition');
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
 * @constructor
 * @export
 * @ngInject
 */
app.DrawController = function($scope, ngeoDecorateInteraction,
    ngeoFeatureOverlayMgr, appFeaturePopup, appDrawnFeatures,
    appSelectedFeatures, appMymaps, gettextCatalog) {

  /**
   * @type {angularGettext.Catalog}
   * @private
   */
  this.translate_ = gettextCatalog;

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
   * @type {app.FeaturePopup}
   * @private
   */
  this.featurePopup_ = appFeaturePopup;

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
  this.featureStyleFunction_ = this.appMymaps_.createStyleFunction();

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
  goog.events.listen(drawPoint, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
      this.onChangeActive_, false, this);
  goog.events.listen(drawPoint, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, false, this);

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
  goog.events.listen(drawLabel, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
      this.onChangeActive_, false, this);
  goog.events.listen(drawLabel, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, false, this);

  var drawLine = new ngeo.interaction.MeasureLength();

  /**
   * @type {ngeo.interaction.MeasureLength}
   * @export
   */
  this.drawLine = drawLine;

  drawLine.setActive(false);
  ngeoDecorateInteraction(drawLine);
  this.map.addInteraction(drawLine);
  goog.events.listen(drawLine, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
      this.onChangeActive_, false, this);
  goog.events.listen(drawLine, ngeo.MeasureEventType.MEASUREEND,
      this.onDrawEnd_, false, this);

  var drawPolygon = new ngeo.interaction.MeasureArea();

  /**
   * @type {ngeo.interaction.MeasureArea}
   * @export
   */
  this.drawPolygon = drawPolygon;

  drawPolygon.setActive(false);
  ngeoDecorateInteraction(drawPolygon);
  this.map.addInteraction(drawPolygon);
  goog.events.listen(drawPolygon, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
      this.onChangeActive_, false, this);
  goog.events.listen(drawPolygon, ngeo.MeasureEventType.MEASUREEND,
      this.onDrawEnd_, false, this);

  var drawCircle = new ngeo.interaction.MeasureAzimut();

  /**
   * @type {ngeo.interaction.MeasureAzimut}
   * @export
   */
  this.drawCircle = drawCircle;

  drawCircle.setActive(false);
  ngeoDecorateInteraction(drawCircle);
  this.map.addInteraction(drawCircle);
  goog.events.listen(drawCircle, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
      this.onChangeActive_, false, this);
  goog.events.listen(drawCircle, ngeo.MeasureEventType.MEASUREEND,
      /**
       * @param {ngeo.MeasureEvent} event
       */
      function(event) {
        // In the case of azimut measure interaction, the feature's geometry is
        // actually a collection (line + circle)
        // For our purpose here, we only need the circle.
        var geometry = /** @type {ol.geom.GeometryCollection} */
            (event.feature.getGeometry());
        event.feature = new ol.Feature(geometry.getGeometries()[1]);
        this.onDrawEnd_(event);
      }, false, this);


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

  goog.events.listen(appSelectedFeatures, ol.CollectionEventType.ADD,
      goog.bind(
      /**
       * @param {ol.CollectionEvent} evt
       */
      function(evt) {
        goog.asserts.assertInstanceof(evt.element, ol.Feature);
        var feature = evt.element;
        feature.set('__selected__', true);

        var editable = !feature.get('__map_id__') ||
            this.appMymaps_.isEditable();
        feature.set('__editable__', editable);
      }, this));

  goog.events.listen(appSelectedFeatures, ol.CollectionEventType.REMOVE,
      /**
       * @param {ol.CollectionEvent} evt
       */
      function(evt) {
        goog.asserts.assertInstanceof(evt.element, ol.Feature);
        var feature = evt.element;
        feature.set('__selected__', false);
      });

  goog.events.listen(selectInteraction,
      ol.interaction.SelectEventType.SELECT,
      /**
       * @param {ol.interaction.SelectEvent} evt
       */
      function(evt) {
        if (evt.selected.length > 0) {
          var feature = evt.selected[0];

          if (!!feature.get('__map_id__')) {
            this.modifyInteraction_.setActive(this.appMymaps_.isEditable());
          } else {
            this.modifyInteraction_.setActive(true);
          }
          this.featurePopup_.show(feature, evt.mapBrowserEvent.coordinate);
        } else {
          this.featurePopup_.hide();
        }
        $scope.$apply();
      }, true, this);

  var modifyInteraction = new ol.interaction.Modify({
    features: appSelectedFeatures,
    deleteCondition: function(event) {
      return false;
    }
  });
  this.map.addInteraction(modifyInteraction);
  goog.events.listen(modifyInteraction, ol.ModifyEventType.MODIFYEND,
      this.onFeatureModifyEnd_, false, this);

  /**
   * @type {ol.interaction.Modify}
   * @private
   */
  this.modifyInteraction_ = modifyInteraction;

  var translateInteraction = new ol.interaction.Translate({
    features: appSelectedFeatures
  });
  this.map.addInteraction(translateInteraction);

  goog.events.listen(
      translateInteraction,
      ol.interaction.TranslateEventType.TRANSLATEEND,
      /**
       * @param {ol.interaction.TranslateEvent} evt
       */
      function(evt) {
        var feature = evt.features.getArray()[0];
        this.featurePopup_.show(feature);
        this.onFeatureModifyEnd_(evt);
      }, false, this);

  var drawOverlay = ngeoFeatureOverlayMgr.getFeatureOverlay();
  drawOverlay.setFeatures(this.drawnFeatures_.getCollection());

  this.drawnFeatures_.drawFeaturesInUrl();
};


/**
 * @param {goog.events.Event} event Event.
 * @private
 */
app.DrawController.prototype.onFeatureModifyEnd_ = function(event) {
  this.scope_.$applyAsync(goog.bind(function() {
    var feature = event.features.getArray()[0];
    this.drawnFeatures_.saveFeature(feature);
  }, this));
};


/**
 * @param {ol.ObjectEvent} event
 * @private
 */
app.DrawController.prototype.onChangeActive_ = function(event) {
  var active = this.drawPoint.getActive() || this.drawLine.getActive() ||
      this.drawPolygon.getActive() || this.drawCircle.getActive();
  this.selectInteraction_.setActive(!active);
};


/**
 * @param {ol.interaction.DrawEvent|ngeo.MeasureEvent} event
 * @private
 */
app.DrawController.prototype.onDrawEnd_ = function(event) {
  var feature = event.feature;
  if (feature.getGeometry().getType() === ol.geom.GeometryType.CIRCLE) {
    var featureGeom = /** @type {ol.geom.Circle} */ (feature.getGeometry());
    feature.setGeometry(
        ol.geom.Polygon.fromCircle(featureGeom)
    );
  }

  /**
   * @type {string}
   */
  var name;
  switch (feature.getGeometry().getType()) {
    case 'Point':
      if (this.drawLabel.getActive()) {
        name = this.translate_.getString('Label');
      } else {
        name = this.translate_.getString('Point');
      }
      break;
    case 'LineString':
      name = this.translate_.getString('LineString');
      break;
    case 'Polygon':
      name = this.translate_.getString('Polygon');
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
  this.featurePopup_.show(feature);
  this.drawnFeatures_.saveFeature(feature);
  this['mymapsOpen'] = true;
};

app.module.controller('AppDrawController', app.DrawController);
