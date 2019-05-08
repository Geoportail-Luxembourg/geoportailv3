/**
 * @module app.infobar.scalelineDirective
 */
/**
 * @fileoverview This file provides a "scaleline" directive. This directive is
 * used to insert an OpenLayers ScaleLine control into the HTML page. It is
 * based on the "ngeo-control" directive.
 *
 * Example:
 *
 * <app-scaleline app-scaleline-map="::mainCtrl.map"></app-scaleline>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */

import appModule from '../module.js';

/**
 * @return {angular.Directive} The Directive Object Definition.
 * @ngInject
 */
const exports = function() {
  return {
    restrict: 'E',
    scope: {
      'map': '=appScalelineMap'
    },
    controller: 'AppScalelineController',
    controllerAs: 'ctrl',
    bindToController: true,
    template: '<div ngeo-control="ctrl.control"' +
        'ngeo-control-map="ctrl.map">'
  };
};


appModule.directive('appScaleline', exports);


export default exports;
