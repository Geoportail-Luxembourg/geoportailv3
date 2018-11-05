/**
 * @module app.measure.MeasureDirective
 */
let exports = {};

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

import appModule from '../module.js';


/**
 * @param {string} appMeasureTemplateUrl Url to measure template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
function measureDirective(appMeasureTemplateUrl) {
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
}


appModule.directive('appMeasure', measureDirective);


export default exports;
