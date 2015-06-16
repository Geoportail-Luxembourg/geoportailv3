/**
 * @fileoverview This file provides a "location information" directive.
 */

goog.provide('app.locationinfoDirective');

goog.require('app');
goog.require('app.CoordinateString');
goog.require('app.GetElevation');
goog.require('app.GetShorturl');
goog.require('app.StateManager');
goog.require('ol.proj');


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
      'open': '=appLocationinfoOpen',
      'appSelector': '=appLocationinfoAppselector'
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
 * @param {angular.$timeout} $timeout
 * @param {app.GetShorturl} appGetShorturl
 * @param {app.GetElevation} appGetElevation
 * @param {app.CoordinateString} appCoordinateString
 * @param {app.StateManager} appStateManager
 * @param {string} qrServiceUrl
 * @param {string} appLocationinfoTemplateUrl
 * @ngInject
 */
app.LocationinfoController =
    function($scope, $timeout, appGetShorturl, appGetElevation, 
        appCoordinateString, appStateManager, qrServiceUrl,
        appLocationinfoTemplateUrl) {

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
    return this['appSelector'];
  }, this), goog.bind(function(newVal) {
    if (newVal != 'locationinfo') {
      var features = this.featureOverlay_.getFeatures();
      features.clear();
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this['open'];
  }, this), goog.bind(function(newVal) {
    var features = this.featureOverlay_.getFeatures();
    if (newVal === false) {
      this.stateManager_.updateState({'crosshair': false});
      this['appSelector'] = undefined;
      features.clear();
      this['featureOverlayItemExists'] = false;
    } else if (newVal === true && features.getLength() >= 1) {
      this.stateManager_.updateState({'crosshair': true});
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
   * @type {Object.<string, string>}
   * @private
   * @const
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

  /**
   * @type {app.StateManager}
   * @private
   */
  this.stateManager_ = appStateManager;

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
        event.preventDefault(); // disable right-click menu on browsers
      }, this));


  /**
   * @type {angular.$timeout}
   * @private
   */
  this.$timeout_ = $timeout;

  /**
   * @type {Object<number, number>}
   * @private
   */
  this.startPixel_ = null;

  /**
   * @type {angular.$q.Promise|undefined}
   * @private
   */
  this.holdPromise_ = undefined;

  // Load infowindow if crosshair variable is set
  var urlLocationInfo = appStateManager.getInitialValue('crosshair');
  if (goog.isDefAndNotNull(urlLocationInfo) &&
      urlLocationInfo === 'true') {
    var x = parseInt(appStateManager.getInitialValue('X'), 0);
    var y = parseInt(appStateManager.getInitialValue('Y'), 0);
    var coordinate = /** @type {ol.Coordinate} */ ([x, y]);
    if (goog.isDef(x) && goog.isDef(y)) {
      this.showInfoPane_(coordinate);
    }
  }

  goog.events.listen(this['map'], ol.MapBrowserEvent.EventType.POINTERDOWN,
      goog.bind(function(event) {
        if (event.originalEvent.which === 3) { // if left mouse click
          this.showInfoPane_(event.originalEvent);
        } else if (!(event.originalEvent instanceof MouseEvent)) {
          // if touch input device
          this.$timeout_.cancel(this.holdPromise_);
          this.startPixel_ = event.pixel;
          var that = this;
          this.holdPromise_ = this.$timeout_(function() {
            that.showInfoPane_(event.originalEvent);
          }, 500, false);
        }
      }, this), false, this);

  goog.events.listen(this['map'], ol.MapBrowserEvent.EventType.POINTERUP,
      goog.bind(function(event) {
        this.$timeout_.cancel(this.holdPromise_);
        this.startPixel_ = null;
      }, this), false, this);

  goog.events.listen(this['map'], ol.MapBrowserEvent.EventType.POINTERMOVE,
      goog.bind(function(event) {
        if (this.startPixel_) {
          var pixel = event.pixel;
          var deltaX = Math.abs(this.startPixel_[0] - pixel[0]);
          var deltaY = Math.abs(this.startPixel_[1] - pixel[1]);
          if (deltaX + deltaY > 6) {
            this.$timeout_.cancel(this.holdPromise_);
            this.startPixel_ = null;
          }
        }
      }, this), false, this);
};


/**
 * @param {MouseEvent|TouchEvent|ol.Coordinate} event
 * @private
 */
app.LocationinfoController.prototype.showInfoPane_ =
    function(event) {
  if (event instanceof MouseEvent || event instanceof TouchEvent) {
    event.preventDefault();
    var clickCoordinate = this.map.getEventCoordinate(event);
  } else {
    var clickCoordinate = event;
  }
  this['open'] = true;
  this['appSelector'] = 'locationinfo';
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
