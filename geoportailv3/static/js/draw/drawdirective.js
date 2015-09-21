/**
 * @fileoverview This file provides a draw directive. This directive is used
 * to create a draw panel in the page.
 *
 * Example:
 *
 * <app-draw app-draw-map="::mainCtrl.map"
 *           app-draw-active="mainCtrl.drawOpen"
 *           app-draw-features="mainCtrl.drawnFeatures"></app-draw>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */
goog.provide('app.DrawController');
goog.provide('app.drawDirective');

goog.require('app');
goog.require('ngeo.DecorateInteraction');
goog.require('ol.events.condition');
goog.require('ol.geom.GeometryType');
goog.require('ol.interaction.Draw');
goog.require('ol.interaction.Select');


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
      'features': '=appDrawFeatures',
      'active': '=appDrawActive'
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
 * @constructor
 * @export
 * @ngInject
 */
app.DrawController = function($scope, ngeoDecorateInteraction) {

  /**
   * @type {ol.Map}
   *  @export
   */
  this.map;

  /**
   * @type {boolean}
   *  @export
   */
  this.active;

  /**
   * @type {number}
   * @private
   */
  this.featureSeq_ = 0;

  /**
   * @type {ol.Collection.<ol.Feature>}
   * @export
   */
  this.features;

  /**
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  var drawPoint = new ol.interaction.Draw({
    features: this.features,
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
  goog.events.listen(drawPoint, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, false, this);

  var drawLine = new ol.interaction.Draw({
    features: this.features,
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
  goog.events.listen(drawLine, ol.interaction.DrawEventType.DRAWEND,
      this.onDrawEnd_, false, this);


  // Watch the "active" property, and disable the draw interactions
  // when "active" gets set to false.
  $scope.$watch(goog.bind(function() {
    return this.active;
  }, this), goog.bind(function(newVal) {
    if (newVal === false) {
      this.drawPoint.setActive(false);
      this.drawLine.setActive(false);
    }
  }, this));
};


/**
 * @param {ol.interaction.DrawEvent} event
 * @private
 */
app.DrawController.prototype.onDrawEnd_ = function(event) {
  event.feature.set('name', 'element ' + (++this.featureSeq_));

  // Deactivating asynchronosly to prevent dbl-click to zoom in
  window.setTimeout(goog.bind(function() {
    this.scope_.$apply(function() {
      event.target.setActive(false);
    });
  }, this), 0);
};

app.module.controller('AppDrawController', app.DrawController);
