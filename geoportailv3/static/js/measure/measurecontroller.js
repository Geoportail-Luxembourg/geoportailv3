/**
 * @fileoverview This file provides a "measure" controller. This controller
 * helps managing the measurement tools.
 */
goog.provide('app.MeasureController');

goog.require('app');
goog.require('ngeo.DecorateInteraction');
goog.require('ngeo.btngroupDirective');
goog.require('ol.interaction.Draw');
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

  this['map'] = $scope['mainCtrl']['map'];


  /** @type {ol.source.Vector} */
  var source = new ol.source.Vector();

  /** @type {ol.layer.Vector} */
  var vector = new ol.layer.Vector({
    source: source,
    style: new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)'
      }),
      stroke: new ol.style.Stroke({
        color: '#ffcc33',
        width: 2
      }),
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({
          color: '#ffcc33'
        })
      })
    })
  });

  this['map'].addLayer(vector);

  /** @type {ol.interaction.Draw} */
  var measureDistance = new ol.interaction.Draw(
      /** @type {olx.interaction.DrawOptions} */ ({
        type: 'LineString',
        source: source
      }));
  measureDistance.setActive(false);
  ngeoDecorateInteraction(measureDistance);
  this['map'].addInteraction(measureDistance);
  this['measureDistance'] = measureDistance;

  /** @type {ol.interaction.Draw} */
  var measureArea = new ol.interaction.Draw(
      /** @type {olx.interaction.DrawOptions} */ ({
        type: 'Polygon',
        source: source
      }));
  measureArea.setActive(false);
  ngeoDecorateInteraction(measureArea);
  this['map'].addInteraction(measureArea);
  this['measureArea'] = measureArea;
};

app.module.controller('AppMeasureController', app.MeasureController);
