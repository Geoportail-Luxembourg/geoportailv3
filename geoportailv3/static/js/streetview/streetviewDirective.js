/**
 * @fileoverview This file provides a streetview overview.
 *
 * Example:
 *  <app-streetview
 *   app-streetview-map="::ctrl.map"
 *   app-streetview-location="ctrl.clickCoordinate">
 *  </app-streetview>
 *
 */
goog.module('app.streetview.streetviewDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appStreetviewTemplateUrl Url to streetview template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appStreetviewTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appStreetviewMap',
      'location': '=appStreetviewLocation'
    },
    controller: 'AppStreetviewController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appStreetviewTemplateUrl
  };
};

appModule.directive('appStreetview', exports);
