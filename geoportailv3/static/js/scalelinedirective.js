goog.provide('app.scalelineDirective');

goog.require('app');
goog.require('ngeo.controlDirective');
goog.require('ol.control.ScaleLine');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @ngInject
 */
app.scalelineDirective = function() {
  return {
    restrict: 'E',
    scope: {
      'map': '=appScalelineMap'
    },
    controller: 'AppScalelineController',
    controllerAs: 'ctrl',
    bindToController: true,
    template: '<div ngeo-control="ctrl.createControl"' +
        'ngeo-control-map="ctrl.map">'
  };
};


app.module.directive('appScaleline', app.scalelineDirective);



/**
 * @ngInject
 * @constructor
 */
app.ScalelineDirectiveController = function() {
  this['createControl'] = function(target) {
    return new ol.control.ScaleLine({
      target: target
    });
  };
};


app.module.controller('AppScalelineController',
    app.ScalelineDirectiveController);
