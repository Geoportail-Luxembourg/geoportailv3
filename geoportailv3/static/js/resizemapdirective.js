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

goog.provide('app.resizemapDirective');

goog.require('app.module');
goog.require('goog.asserts');
goog.require('goog.async.AnimationDelay');
goog.require('ol.Map');


/**
 * @param {angular.$window} $window Angular window service.
 * @return {angular.Directive} The directive specs.
 * @ngInject
 */
app.resizemapDirective = function($window) {
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
          goog.asserts.assertInstanceof(map, ol.Map);

          var stateExpr = attrs['appResizemapState'];
          goog.asserts.assert(goog.isDef(stateExpr));

          var /** @type {number} */ start = -1;

          var animationDelay = new goog.async.AnimationDelay(
              function() {
                goog.asserts.assert(start != -1);

                map.updateSize();
                map.renderSync();

                if (goog.now() - start < duration) {
                  animationDelay.start();
                }
              }, $window);

          element.bind('transitionend', function() {
            map.updateSize();
            map.renderSync();
          });

          scope.$watch(stateExpr, function(newVal, oldVal) {
            if (newVal != oldVal) {
              start = goog.now();
              animationDelay.stop();
              animationDelay.start();
            }
          });
        }
  };
};


app.module.directive('appResizemap', app.resizemapDirective);
