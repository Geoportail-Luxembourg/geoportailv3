/**
 * @fileoverview This file provides a "location information" directive.
 */

goog.module('app.locationinfo.locationinfoDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appLocationinfoTemplateUrl The template.
 * @return {angular.Directive} The directive.
 * @ngInject
 */
exports = function(appLocationinfoTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appLocationinfoMap',
      'open': '=appLocationinfoOpen',
      'routingOpen': '=appLocationinfoRoutingOpen',
      'hiddenContent': '=appLocationinfoHiddenContent',
      'appSelector': '=appLocationinfoAppselector'
    },
    controller: 'AppLocationinfoController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appLocationinfoTemplateUrl
  };
};

appModule.directive('appLocationinfo', exports);
