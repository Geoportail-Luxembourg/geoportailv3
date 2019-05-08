/**
 * @module app.map.mapDirective
 */
/**
 * @fileoverview This file provides the "map" directive.
 *
 * Example:
 *
 * <app-map app-map-map="::mainCtrl.map"><app-map>
 */

import appModule from '../module.js';

/**
 * @param {string} appMapTemplateUrl URL to map template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appMapTemplateUrl) {
  return {
    scope: {
      'map': '=appMapMap'
    },
    bindToController: true,
    controller: 'AppMapController',
    controllerAs: 'ctrl',
    templateUrl: appMapTemplateUrl
  };
};


appModule.directive('appMap', exports);


export default exports;
