/**
 * @fileoverview This file provides a "location information" directive.
 */

goog.provide('app.locationinfoDirective');

goog.require('app');
goog.require('app.GetShorturl');


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
 * @param {app.GetShorturl} appGetShorturl
 * @param {string} appLocationinfoTemplateUrl
 */
app.LocationinfoController =
    function($http, appGetShorturl, appLocationinfoTemplateUrl) {

  var map = this['map'];

  /**
   * @type {string}
   */
  this['url'] = '';

  /**
   * @type {app.GetShorturl}
   * @private
   */
  this.getShorturl_ = appGetShorturl;

  map.getViewport().addEventListener('contextmenu', goog.bind(function(event) {
    event.preventDefault();
    this['infoOpen'] = true;
    var clickCoordinate = this.map.getEventCoordinate(event);
    this.getShorturl_(clickCoordinate).then(goog.bind(
        /**
       * @param {string} shorturl The short URL.
       */
        function(shorturl) {
          this['url'] = shorturl;
        }, this));
  }, this));
};

app.module.controller('AppLocationinfoController', app.LocationinfoController);
