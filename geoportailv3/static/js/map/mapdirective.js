/**
 * @fileoverview This file provides the "map" directive.
 *
 * Example:
 *
 * <app-map app-map-map="::mainCtrl.map"><app-map>
 */
goog.provide('app.map.mapDirective');

goog.require('app.module');


/**
 * @param {string} appMapTemplateUrl URL to map template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.map.mapDirective = function(appMapTemplateUrl) {
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


app.module.directive('appMap', app.map.mapDirective);
