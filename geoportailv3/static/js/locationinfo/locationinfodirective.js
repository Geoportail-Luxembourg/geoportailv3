/**
 * @fileoverview This file provides a "location information" directive.
 */

goog.provide('app.locationinfoDirective');

goog.require('app');
goog.require('app.CoordinateString');
goog.require('app.GetElevation');
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
      'open': '=appLocationinfoOpen'
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
 * @param {angular.Scope} $scope
 * @param {app.GetShorturl} appGetShorturl
 * @param {app.GetElevation} appGetElevation
 * @param {app.CoordinateString} appCoordinateString
 * @param {string} qrServiceUrl
 * @param {string} appLocationinfoTemplateUrl
 * @ngInject
 */
app.LocationinfoController =
    function($scope, appGetShorturl, appGetElevation, 
        appCoordinateString, qrServiceUrl, appLocationinfoTemplateUrl) {

  /**
   * @type {app.CoordinateString}
   * @private
   */
  this.coordinateString_ = appCoordinateString;

  /**
   * @type {ol.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = this.createFeatureOverlay_();

  /**
   * @type {boolean}
   */
  this['featureOverlayItemExists'] = false;

  $scope.$watch(goog.bind(function() {
    return this['open'];
  }, this), goog.bind(function(newVal) {
    var features = this.featureOverlay_.getFeatures();
    if (newVal === false) {
      features.clear();
      this['featureOverlayItemExists'] = false;
    } else if (newVal === true && features.getLength() >= 1) {
      this['featureOverlayItemExists'] = true;
    }
  }, this));

  /**
   * @type {string}
   */
  this['url'] = '';

  /**
   * @type {string}
   */
  this['qrUrl'] = '';

  /**
   * @type {string}
   */
  this['elevation'] = '';

  /**
   * @type {app.GetElevation}
   * @private
   */
  this.getElevation_ = appGetElevation;

  /**
   * @type {app.GetShorturl}
   * @private
   */
  this.getShorturl_ = appGetShorturl;

  /**
   * @type {string}
   * @private
   */
  this.qrServiceUrl_ = qrServiceUrl;

  /**
   * @type {Object}
   * @private
   */
  this.projections_ = {
    'EPSG:2169': 'Luref',
    'EPSG:4326': 'Lon/Lat WGS84',
    'EPSG:4326:DMS': 'Lon/Lat WGS84 DMS',
    'EPSG:3263*': 'WGS84 UTM'
  };

  /**
   * @type {ol.Coordinate|undefined}
   */
  this['coordinate'] = undefined;

  /**
   * @type {Object}
   */
  this['location'] = {};

  $scope.$watch(goog.bind(function() {
    return this['coordinate'];
  }, this), goog.bind(function(newVal) {
    if (goog.isDef(newVal)) {
      this['location'] = {};
      goog.object.forEach(this.projections_, function(value, key) {
        var sourceEpsgCode = this['map'].getView().getProjection().getCode();
        if (key === 'EPSG:4326:DMS') {
          var epsgCode = goog.string.remove(key, ':DMS');
          this['location'][value] = this.coordinateString_(
              this['coordinate'], sourceEpsgCode, epsgCode, true);
        } else {
          this['location'][value] = this.coordinateString_(
              this['coordinate'], sourceEpsgCode, key);
        }
      }, this);
    }
  }, this));

  this['map'].getViewport()
    .addEventListener('contextmenu', goog.bind(function(event) {
        event.preventDefault();
        this['open'] = true;
        var clickCoordinate = this.map.getEventCoordinate(event);
        this['coordinate'] = clickCoordinate;
        var feature = /** @type {ol.Feature} */
            (new ol.Feature(new ol.geom.Point(clickCoordinate)));
        var features = this.featureOverlay_.getFeatures();
        features.clear();
        features.push(feature);
        this['featureOverlayItemExists'] = true;
        this.getElevation_(clickCoordinate).then(goog.bind(
            function(elevation) {
              this['elevation'] = elevation;
            }, this
            ));
        this.getShorturl_(clickCoordinate).then(goog.bind(
            function(shorturl) {
              this['url'] = shorturl;
              this['qrUrl'] = this.qrServiceUrl_ + '?url=' + shorturl;
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
