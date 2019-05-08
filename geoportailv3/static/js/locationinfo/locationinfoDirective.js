/**
 * @module app.locationinfo.locationinfoDirective
 */
/**
 * @fileoverview This file provides a "location information" directive.
 */

import appModule from '../module.js';

/**
 * @param {string} appLocationinfoTemplateUrl The template.
 * @return {angular.Directive} The directive.
 * @ngInject
 */
const exports = function(appLocationinfoTemplateUrl) {
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


export default exports;
