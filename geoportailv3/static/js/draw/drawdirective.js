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
goog.require('ol.CollectionEventType');
goog.require('ol.FeatureStyleFunction');
goog.require('ol.events.condition');
goog.require('ol.geom.GeometryType');
goog.require('ol.interaction.Draw');
goog.require('ol.interaction.Modify');
goog.require('ol.interaction.Select');
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
      'queryActive': '=appDrawQueryactive'
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
 * @constructor
 * @export
 * @ngInject
 */
app.DrawController = function($scope, ngeoDecorateInteraction,
    ngeoFeatureOverlayMgr, appFeaturePopup, appDrawnFeatures,
    appSelectedFeatures, appMymaps) {

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
   * @type {number}
   * @private
   */
  this.featureSeq_ = 0;

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
    features: this.drawnFeatures_.getCollection(),
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

  var drawLine = new ol.interaction.Draw({
    features: this.drawnFeatures_.getCollection(),
    type: ol.geom.GeometryType.LINE_STRING
  });

  /**
   * @type {ol.interaction.Draw}
   * @export
   */
  this.drawLine = drawLine;

  drawLine.setActive(false);
  ngeoDecorateInteraction(drawLine);
  this.map.addInteraction(drawLine);
  goog.events.listen(drawLine, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
      this.onChangeActive_, false, this);
  goog.events.listen(drawLine, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, false, this);

  var drawPolygon = new ol.interaction.Draw({
    features: this.drawnFeatures_.getCollection(),
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
  goog.events.listen(drawPolygon, ol.Object.getChangeEventType(
      ol.interaction.InteractionProperty.ACTIVE),
      this.onChangeActive_, false, this);
  goog.events.listen(drawPolygon, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, false, this);


  // Watch the "active" property, and disable the draw interactions
  // when "active" gets set to false.
  $scope.$watch(goog.bind(function() {
    return this.active;
  }, this), goog.bind(function(newVal) {
    if (newVal === false) {
      this.drawPoint.setActive(false);
      this.drawLine.setActive(false);
      this.drawPolygon.setActive(false);
      this['queryActive'] = true;
    } else {
      this['queryActive'] = false;
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
      goog.bind(function(evt) {
        goog.asserts.assertInstanceof(evt.element, ol.Feature);
        var feature = evt.element;
        feature.set('__selected__', true);
        if (feature.get('__source__') == 'mymaps') {
          feature.set('__editable__', this.appMymaps_.isEditable());
        } else {
          feature.set('__editable__', true);
        }
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

          if (feature.get('__source__') == 'mymaps') {
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
    features: appSelectedFeatures
  });
  this.map.addInteraction(modifyInteraction);
  goog.events.listen(modifyInteraction, ol.ModifyEventType.MODIFYEND,
      this.onFeatureModifyEnd_, false, this);

  /**
   * @type {ol.interaction.Modify}
   * @private
   */
  this.modifyInteraction_ = modifyInteraction;

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
      this.drawPolygon.getActive();
  this.selectInteraction_.setActive(!active);
};


/**
 * @param {ol.interaction.DrawEvent} event
 * @private
 */
app.DrawController.prototype.onDrawEnd_ = function(event) {
  var feature = event.feature;
  feature.set('name', 'element ' + (++this.featureSeq_));
  feature.set('__editable__', true);
  feature.set('color', '#ed1c24');
  feature.set('opacity', 0.2);
  feature.set('stroke', 1.25);
  feature.set('size', 10);
  feature.set('angle', 0);
  feature.set('is_label', false);
  feature.set('linestyle', 'plain');
  feature.set('symbol_id', 'circle');
  feature.setStyle(this.featureStyleFunction_);

  // Deactivating asynchronosly to prevent dbl-click to zoom in
  window.setTimeout(goog.bind(function() {
    this.scope_.$apply(function() {
      event.target.setActive(false);
    });
  }, this), 0);

  this.drawnFeatures_.add(feature);

  this.selectedFeatures_.clear();
  this.selectedFeatures_.push(feature);
  this.featurePopup_.show(feature);
};

app.module.controller('AppDrawController', app.DrawController);
