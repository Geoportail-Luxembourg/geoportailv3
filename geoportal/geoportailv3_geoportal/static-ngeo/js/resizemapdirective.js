/**
 * @module app.resizemapDirective
 */
/**
 * @fileoverview Provides a directive that resizes the map in an animation
 * loop during 2 second when the value of "state" changes.
 *
 * Example:
 *
 * <div ng-class"ctrl.open" app-resizemap="ctrl.map"
 *      app-resizemap-state="ctrl.open">
 * <div>
 */

import appModule from './module.js';
import olMap from 'ol/Map.js';

/**
 * @param {angular.$window} $window Angular window service.
 * @return {angular.Directive} The directive specs.
 * @ngInject
 */
const exports = function($window) {
  var /** @type {number} */ duration = 2000;
  return {
    restrict: 'A',
    link:
        /**
         * @param {!angular.Scope} scope Scope.
         * @param {angular.JQLite} element Element.
         * @param {angular.Attributes} attrs Attributes.
         */
        function(scope, element, attrs) {

          var map = scope.$eval(attrs['appResizemap']);
          console.assert(map instanceof olMap);

          var stateExpr = attrs['appResizemapState'];
          console.assert(stateExpr !== undefined);

          var /** @type {number} */ start = -1;
          var animationDelayKey;
          var animationDelay = () => {
            console.assert(start != -1);
            map.updateSize();
            map.renderSync();

            if (Date.now() - start < duration) {
              animationDelayKey = $window.requestAnimationFrame(animationDelay);
            }
          };

          element.bind('transitionend', function() {
            map.updateSize();
            map.renderSync();
          });

          scope.$watch(stateExpr, function(newVal, oldVal) {
            if (newVal != oldVal) {
              start = Date.now();
              $window.cancelAnimationFrame(animationDelayKey);
              animationDelayKey = $window.requestAnimationFrame(animationDelay);
            }
          });
        }
  };
};


appModule.directive('appResizemap', exports);


export default exports;
