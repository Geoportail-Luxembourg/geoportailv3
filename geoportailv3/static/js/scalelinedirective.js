goog.provide('app_scaleline_directive');

goog.require('app');
goog.require('ngeo_control_directive');
goog.require('ol.control.ScaleLine');

(function() {
  var module = angular.module('app');

  module.directive('appScaleline', [
    /**
     * @return {angular.Directive} The Directive Object Definition.
     */
    function() {
      return {
        restrict: 'E',
        scope: {
          map: '=appScalelineMap'
        },
        controller: function() {
          this['createControl'] = function(target) {
            return new ol.control.ScaleLine({
              target: target
            });
          };
        },
        controllerAs: 'ctrl',
        bindToController: true,
        template: '<div ngeo-control="ctrl.createControl"' +
            'ngeo-control-map="ctrl.map">'
      };
    }
  ]);
})();
