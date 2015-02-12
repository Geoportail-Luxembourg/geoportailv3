/**
 * @fileoverview This file provides a "measure" controller. This controller
 * helps managing the measurement tools.
 */
goog.provide('app.MeasureController');

goog.require('app');
goog.require('ngeo.DecorateInteraction');
goog.require('ngeo.btngroupDirective');
goog.require('ngeo.interaction.MeasureLength');
goog.require('ngeo.interaction.MeasureArea');
goog.require('ngeo.interaction.MeasureAzimut');
goog.require('ol.source.Vector');


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

  this['map'] = $scope['mainCtrl']['map'];

  /** @type {ngeo.interaction.MeasureLength} */
  var measureLength = new ngeo.interaction.MeasureLength({
    sketchStyle: style
  });
  measureLength.setActive(false);
  ngeoDecorateInteraction(measureLength);
  this['map'].addInteraction(measureLength);
  this['measureLength'] = measureLength;

  /** @type {ngeo.interaction.MeasureArea} */
  var measureArea = new ngeo.interaction.MeasureArea({
    sketchStyle: style
  });
  measureArea.setActive(false);
  ngeoDecorateInteraction(measureArea);
  this['map'].addInteraction(measureArea);
  this['measureArea'] = measureArea;

  /** @type {ngeo.interaction.MeasureAzimut} */
  var measureAzimut = new ngeo.interaction.MeasureAzimut({
    sketchStyle: style
  });
  measureAzimut.setActive(false);
  ngeoDecorateInteraction(measureAzimut);
  this['map'].addInteraction(measureAzimut);
  this['measureAzimut'] = measureAzimut;
};

app.module.controller('AppMeasureController', app.MeasureController);
