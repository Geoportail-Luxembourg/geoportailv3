/**
 * @fileoverview This file provides a "location information" directive.
 */

goog.provide('app.locationinfoDirective');

goog.require('app');


/**
 * @param {string} appLocationinfoTemplateUrl
 * @return {angular.Directive}
 * @ngInject
 */
app.locationinfoDirective = function(appLocationinfoTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appLocationinfoMap',
      'infoOpen': '=appLocationinfoOpen'
    },
    controller: 'AppLocationinfoController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appLocationinfoTemplateUrl
  };
};

app.module.directive('appLocationinfo', app.locationinfoDirective);



/**
 * @constructor
 * @param {angular.$http} $http
 * @param {string} appLocationinfoTemplateUrl
 */
app.LocationinfoController = function($http, appLocationinfoTemplateUrl) {

  var map = this['map'];

  map.getViewport().addEventListener('contextmenu', goog.bind(function(event) {
    event.preventDefault();
    this['infoOpen'] = true;
    var clickLocation = this.map.getEventCoordinate(event);
    var lurefCoordinate =
      ol.proj.transform(clickLocation, 'EPSG:3857', 'EPSG:2169');
  }, this));
};

app.module.controller('AppLocationinfoController', app.LocationinfoController);
