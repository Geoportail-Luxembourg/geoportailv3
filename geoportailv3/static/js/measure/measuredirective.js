/**
 * @fileoverview This file provides a measure directive. This directive is used
 * to create a measure panel in the page.
 *
 * Example:
 *
 * <app-measure app-measure-map="::mainCtrl.map"></app-measure>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */
goog.provide('app.measureDirective');

goog.require('app');
goog.require('ngeo.DecorateInteraction');
goog.require('ngeo.btngroupDirective');
goog.require('ngeo.interaction.MeasureArea');
goog.require('ngeo.interaction.MeasureAzimut');
goog.require('ngeo.interaction.MeasureLength');
goog.require('ol.source.Vector');


/**
 * @param {string} appMeasureTemplateUrl Url to layermanager template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.measureDirective = function(appMeasureTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appMeasureMap',
      'active': '=appMeasureActive'
    },
    controller: 'AppMeasureController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appMeasureTemplateUrl
  };
};


app.module.directive('appMeasure', app.measureDirective);



/**
 * @param {angular.Scope} $scope Scope.
 * @param {ngeo.DecorateInteraction} ngeoDecorateInteraction Decorate
 *     interaction service.
 * @constructor
 * @export
 * @ngInject
 */
app.MeasureController = function($scope, ngeoDecorateInteraction) {

  var style = new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 255, 0.2)'
    }),
    stroke: new ol.style.Stroke({
      color: 'rgba(0, 0, 0, 0.5)',
      lineDash: [10, 10],
      width: 2
    }),
    image: new ol.style.Circle({
      radius: 5,
      stroke: new ol.style.Stroke({
        color: 'rgba(0, 0, 0, 0.7)'
      }),
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)'
      })
    })
  });

  /**
   * @type {ol.Map}
   */
  var map = this['map'];

  var measureLength = new ngeo.interaction.MeasureLength({
    sketchStyle: style
  });

  /**
   * @type {ngeo.interaction.MeasureLength}
   */
  this['measureLength'] = measureLength;

  measureLength.setActive(false);
  ngeoDecorateInteraction(measureLength);
  map.addInteraction(measureLength);

  var measureArea = new ngeo.interaction.MeasureArea({
    sketchStyle: style
  });

  /**
   * @type {ngeo.interaction.MeasureArea}
   */
  this['measureArea'] = measureArea;

  measureArea.setActive(false);
  ngeoDecorateInteraction(measureArea);
  map.addInteraction(measureArea);

  /** @type {ngeo.interaction.MeasureAzimut} */
  var measureAzimut = new ngeo.interaction.MeasureAzimut({
    sketchStyle: style
  });

  /**
   * @type {ngeo.interaction.MeasureAzimut}
   */
  this['measureAzimut'] = measureAzimut;

  measureAzimut.setActive(false);
  ngeoDecorateInteraction(measureAzimut);
  map.addInteraction(measureAzimut);

  // Watch the "active" property, and disable the measure interactions
  // when "active" gets set to false.
  $scope.$watch(goog.bind(function() {
    return this['active'];
  }, this), goog.bind(function(newVal) {
    if (newVal === false) {
      this['measureLength'].setActive(false);
      this['measureArea'].setActive(false);
      this['measureAzimut'].setActive(false);
    }
  }, this));
};


app.module.controller('AppMeasureController', app.MeasureController);
