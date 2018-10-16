/**
 * @fileoverview This file provides a "location information" directive.
 */

goog.provide('app.locationinfo.locationinfoDirective');

goog.require('app.module');


/**
 * @param {string} appLocationinfoTemplateUrl The template.
 * @return {angular.Directive} The directive.
 * @ngInject
 */
app.locationinfo.locationinfoDirective = function(appLocationinfoTemplateUrl) {
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

app.module.directive('appLocationinfo', app.locationinfo.locationinfoDirective);
