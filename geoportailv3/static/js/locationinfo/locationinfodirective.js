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
 * @param {angular.Scope} $scope
 * @param {app.GetShorturl} appGetShorturl
 * @param {string} appLocationinfoTemplateUrl
 */
app.LocationinfoController =
    function($http, $scope, appGetShorturl, appLocationinfoTemplateUrl) {

  var map = this['map'];

  /**
   * @type {ol.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = this.createFeatureOverlay_();

  $scope.$watch(goog.bind(function() {
    return this['infoOpen'];
  }, this), goog.bind(function(newVal) {
    if (newVal === false) {
      var features = this.featureOverlay_.getFeatures();
      features.clear();
    }
  }, this));

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
    var feature = /** @type {ol.Feature} */
        (new ol.Feature(new ol.geom.Point(clickCoordinate)));
    var features = this.featureOverlay_.getFeatures();
    features.clear();
    features.push(feature);
    this.getShorturl_(clickCoordinate).then(goog.bind(
        /**
       * @param {string} shorturl The short URL.
       */
        function(shorturl) {
          this['url'] = shorturl;
        }, this));
  }, this));
};


/**
 * @return {ol.FeatureOverlay} The feature overlay.
 * @private
 */
app.LocationinfoController.prototype.createFeatureOverlay_ =
    function() {
  var featureFill = new ol.style.Fill({
    color: [255, 255, 0, 0.6]
  });
  var featureStroke = new ol.style.Stroke({
    color: [255, 155, 55, 1],
    width: 3
  });
  var featureOverlay = new ol.FeatureOverlay({
    style: new ol.style.Style({
      fill: featureFill,
      stroke: featureStroke,
      image: new ol.style.Circle({
        radius: 10,
        fill: featureFill,
        stroke: featureStroke
      })
    })
  });
  featureOverlay.setMap(this['map']);
  return featureOverlay;
};

app.module.controller('AppLocationinfoController', app.LocationinfoController);
