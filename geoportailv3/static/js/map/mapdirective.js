/**
 * @fileoverview This file provides the "map" directive.
 *
 * Example:
 *
 * <app-map app-map-map="::mainCtrl.map"><app-map>
 */
goog.module('app.map.mapDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appMapTemplateUrl URL to map template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appMapTemplateUrl) {
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
