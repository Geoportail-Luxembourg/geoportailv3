/**
 * @module app.print.printDirective
 */
/**
 * @fileoverview This file provides a print directive. This directive is used
 * to create a print form panel in the page.
 *
 * Example:
 *
 * <app-print app-print-map="::mainCtrl.map"
 *            app-print-open="mainCtrl.printOpen"
 *            app-print-layers="mainCtrl.selectedLayers">
 * </app-print>
 */

import appModule from '../module.js';

/**
 * @param {string} appPrintTemplateUrl Url to print template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appPrintTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appPrintMap',
      'open': '=appPrintOpen',
      'infoOpen': '=appPrintInfoOpen',
      'routingOpen': '=appPrintRoutingOpen',
      'layers': '=appPrintLayers'
    },
    controller: 'AppPrintController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appPrintTemplateUrl
  };
};


appModule.directive('appPrint', exports);


export default exports;
