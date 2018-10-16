/**
 * @fileoverview This file provides a "location information" directive.
 */

goog.provide('app.locationinfo.LocationinfoController');

goog.require('app.module');
goog.require('goog.array');
goog.require('ol.Feature');
goog.require('ol.events');
goog.require('ol.geom.Point');
goog.require('ol.layer.Vector');
goog.require('ol.proj');
goog.require('ol.source.Vector');
goog.require('ol.style.Circle');
goog.require('ol.style.Fill');
goog.require('ol.style.Stroke');
goog.require('ol.style.Style');
goog.require('ol.MapBrowserEventType');
goog.require('ol.extent');


/**
 * @constructor
 * @param {angular.Scope} $scope The scope.
 * @param {angular.$timeout} $timeout The timeout service.
 * @param {app.GetShorturl} appGetShorturl The short url service.
 * @param {app.GetElevation} appGetElevation The elevation service.
 * @param {app.CoordinateString} appCoordinateString The coordinate to string
 * service.
 * @param {app.StateManager} appStateManager The state manager service.
 * @param {string} qrServiceUrl The qr service url.
 * @param {string} appLocationinfoTemplateUrl The template url.
 * @param {app.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {app.Geocoding} appGeocoding appGeocoding The geocoding service.
 * @param {app.GetDevice} appGetDevice The device service.
 * @param {ngeo.statemanager.Location} ngeoLocation ngeo location service.
 * @param {app.Themes} appThemes The themes service.
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode The layer
 * @param {ol.Extent} bboxLidar Bbox of lidar.
 * @param {string} bboxSrsLidar Bbox srs of lidar.
 * @param {string} lidarDemoUrl Url to the demo of lidar.
 * @param {app.Routing} appRouting The routing service.
 * @param {angular.$sce} $sce Angular $sce service.
 * @param {app.LocationInfoOverlay} appLocationInfoOverlay The overlay.
 * @param {app.Activetool} appActivetool The activetool service.
 * @ngInject
 */
app.locationinfo.LocationinfoController = function(
        $scope, $timeout,
        appGetShorturl, appGetElevation, appCoordinateString, appStateManager,
        qrServiceUrl, appLocationinfoTemplateUrl, appSelectedFeatures,
        appGeocoding, appGetDevice, ngeoLocation, appThemes,
        appGetLayerForCatalogNode, bboxLidar, bboxSrsLidar, lidarDemoUrl,
        appRouting, $sce, appLocationInfoOverlay, appActivetool) {
  /**
   * @type {app.Activetool}
   * @private
   */
  this.appActivetool_ = appActivetool;

  /**
   * @type {angular.$sce}
   * @private
   */
  this.sce_ = $sce;

  /**
   * @type {string}
   * @private
   */
  this.lidarDemoUrl_ = lidarDemoUrl;

  /**
   * @type {ol.Extent}
   * @private
   */
  this.lidarExtent_ = ol.proj.transformExtent(
    bboxLidar, bboxSrsLidar, this['map'].getView().getProjection());

  /**
   * @type {app.Routing}
   * @export
   */
  this.appRouting_ = appRouting;


  /**
   * @type {app.GetLayerForCatalogNode}
   * @private
   */
  this.getLayerFunc_ = appGetLayerForCatalogNode;

  /**
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

  /**
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  /**
   * @private
   * @type {app.GetDevice}
   */
  this.appGetDevice_ = appGetDevice;

  /**
   * @type {app.CoordinateString}
   * @private
   */
  this.coordinateString_ = appCoordinateString;

  /**
   * @type {boolean}
   * @private
   */
  this.openInPointerDown_ = false;

  /**
   * @type {boolean}
   * @export
   */
  this.isInBoxOfLidar = false;

 /**
   * @type {ol.layer.Vector}
   * @private
   */
  this.featureLayer_ = new ol.layer.Vector({
    source: new ol.source.Vector(),
    zIndex: 1000,
    'altitudeMode': 'clampToGround'
  });
  this['map'].addLayer(this.featureLayer_);
  var defaultFill = new ol.style.Fill({
    color: [255, 255, 0, 0.6]
  });
  var circleStroke = new ol.style.Stroke({
    color: [255, 155, 55, 1],
    width: 3
  });

  var pointStyle = new ol.style.Circle({
    radius: 10,
    fill: defaultFill,
    stroke: circleStroke
  });

  this.featureLayer_.setStyle(
    /**
     * @param {ol.Feature|ol.render.Feature} feature Feature.
     * @param {number} resolution Resolution.
     * @return {Array.<ol.style.Style>} Array of styles.
     */
    function(feature, resolution) {
      return [new ol.style.Style({
        image: pointStyle
      })];
    });

  $scope.$watch(goog.bind(function() {
    return this['appSelector'];
  }, this), goog.bind(function(newVal) {
    if (newVal != 'locationinfo') {
      this.featureLayer_.getSource().clear();
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this['open'];
  }, this), goog.bind(function(newVal, oldVal) {
    if (newVal == oldVal) {
      return;
    }
    if (newVal === false) {
      this.appActivetool_.streetviewActive = false;
      this['hiddenContent'] = false;
      this.stateManager_.updateState({'crosshair': false});
      var mapCenterCoordinate = this['map'].getView().getCenter();
      this.stateManager_.updateState({
        'X': parseInt(mapCenterCoordinate[0], 0),
        'Y': parseInt(mapCenterCoordinate[1], 0)
      });
      this['appSelector'] = undefined;
      this['location'] = {};
      this.featureLayer_.getSource().clear();
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
   * @type {number}
   * @private
   */
  this.rawElevation_ = 0;

  /**
   * @type {string}
   */
  this['address'] = '';

  /**
   * @type {string}
   */
  this['distance'] = '';

  /**
   * @type {app.GetElevation}
   * @private
   */
  this.getElevation_ = appGetElevation;

  /**
   * @type {app.Geocoding}
   * @private
   */
  this.geocode_ = appGeocoding;

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
    'EPSG:4326:DMm': 'Lon/Lat WGS84 DM',
    'EPSG:3263*': 'WGS84 UTM'
  };

  /**
   * @type {Object}
   */
  this['location'] = {};

  /**
   * @type {app.StateManager}
   * @private
   */
  this.stateManager_ = appStateManager;

  /**
   * @type {ol.Coordinate | undefined}
   * @private
   */
  this.clickCoordinateLuref_ = undefined;

  /**
   * @type {ol.Coordinate | undefined}
   * @private
   */
  this.clickCoordinate4326_ = undefined;

  /**
   * @type {Object<number, number>}
   */
  var startPixel = null;

  /**
   * @type {angular.$q.Promise|undefined}
   */
  var holdPromise;

  /**
   * @type {ol.Coordinate}
   * @export
   */
  this.clickCoordinate = null;

  // Load infowindow if crosshair variable is set
  var urlLocationInfo = appStateManager.getInitialValue('crosshair');
  if (goog.isDefAndNotNull(urlLocationInfo) &&
      urlLocationInfo === 'true') {
    var x = parseInt(appStateManager.getInitialValue('X'), 0);
    var y = parseInt(appStateManager.getInitialValue('Y'), 0);
    var version = this.stateManager_.getVersion();

    if (goog.isDef(x) && goog.isDef(y)) {
      var coordinate = version === 3 ?
          /** @type {ol.Coordinate} */ ([x, y]) :
          /** @type {ol.Coordinate} */ (ol.proj.transform([y, x], 'EPSG:2169',
              this['map'].getView().getProjection()));
      this.setClickCordinate_(coordinate);
      this.loadInfoPane_();
      if (!this.appGetDevice_.testEnv('xs')) {
        this['open'] = true;
        this['hiddenContent'] = false;
      } else {
        this['hiddenContent'] = true;
      }
    }
  }
  if (goog.isDef(this.ngeoLocation_.getParam('address'))) {
    this.appThemes_.getFlatCatalog().then(function(flatCatalogue) {
      var node = goog.array.find(flatCatalogue,
        function(catalogueLayer) {
          return catalogueLayer['name'] === 'addresses';
        }, this);
      if (goog.isDefAndNotNull(node)) {
        var layer = this.getLayerFunc_(node);
        if (this['map'].getLayers().getArray().indexOf(layer) <= 0) {
          this['map'].addLayer(layer);
        }
      }
    }.bind(this));
    var address = this.ngeoLocation_.getParam('address');
    goog.asserts.assert(goog.isDef(address));
    this.geocode_.geocode(address).then(function(data) {
      var results = data['results'];
      if (goog.isDef(results) && results.length > 0) {
        var coordinates = /** @type {ol.Coordinate} */
            (ol.proj.transform(
                results[0]['geom']['coordinates'], 'EPSG:2169',
                this['map'].getView().getProjection()));
        this['map'].getView().setZoom(17);
        this['map'].getView().setCenter(coordinates);
        this.setClickCordinate_(coordinates);
        if (!this.appGetDevice_.testEnv('xs')) {
          this['open'] = true;
          this['hiddenContent'] = false;
        } else {
          this['hiddenContent'] = true;
        }
      }
    }.bind(this));
  }
  $scope.$watch(goog.bind(function() {
    return this.clickCoordinate;
  }, this), goog.bind(function(newVal, oldVal) {
    if (newVal == oldVal) {
      return;
    }
    this.loadInfoPane_();
  }, this));

  ol.events.listen(this['map'], ol.MapBrowserEventType.POINTERDOWN,
    goog.bind(function(event) {
      if (!appSelectedFeatures.getLength()) {
        if (event.originalEvent.which === 3) { // if right mouse click
          this.setClickCordinate_(event.originalEvent);
          this['open'] = true;
          this.openInPointerDown_ = true;
        } else if (!(event.originalEvent instanceof MouseEvent)) {
          // if touch input device
          $timeout.cancel(holdPromise);
          startPixel = event.pixel;
          var that = this;
          holdPromise = $timeout(function() {
            that.setClickCordinate_(event.originalEvent);
            that['open'] = true;
          }, 500, false);
        }
      }
    }, this), this);

  ol.events.listen(this['map'], ol.MapBrowserEventType.POINTERUP,
      goog.bind(function(event) {
        $timeout.cancel(holdPromise);
        startPixel = null;
      }, this), this);

  ol.events.listen(this['map'], ol.MapBrowserEventType.POINTERMOVE,
      goog.bind(function(event) {
        if (startPixel) {
          var pixel = event.pixel;
          var deltaX = Math.abs(startPixel[0] - pixel[0]);
          var deltaY = Math.abs(startPixel[1] - pixel[1]);
          if (deltaX + deltaY > 6) {
            $timeout.cancel(holdPromise);
            startPixel = null;
          }
        }
      }, this), this);

  this['map'].getViewport()
    .addEventListener('contextmenu', goog.bind(function(event) {
      event.preventDefault(); // disable right-click menu on browsers
      if (!this.openInPointerDown_) {
        this.setClickCordinate_(event);
        this['open'] = true;
      }
      this.openInPointerDown_ = false;
    }, this));

};


/**
 * @param {ol.Coordinate} coordinate The coordinate.
 * @private
 */
app.locationinfo.LocationinfoController.prototype.updateLocation_ = function(coordinate) {
  this['location'] = {};
  goog.object.forEach(this.projections_, function(value, key) {
    var sourceEpsgCode = this['map'].getView().getProjection().getCode();
    if (key === 'EPSG:4326:DMS') {
      this['location'][value] = this.coordinateString_(
          coordinate, sourceEpsgCode, 'EPSG:4326', true, false);
    } else if (key === 'EPSG:4326:DMm') {
      this['location'][value] = this.coordinateString_(
          coordinate, sourceEpsgCode, 'EPSG:4326', false, true);
    } else {
      this['location'][value] = this.coordinateString_(
          coordinate, sourceEpsgCode, key, false, false);
    }
  }, this);
};


/**
 * @export
 */
app.locationinfo.LocationinfoController.prototype.addRoutePoint = function() {
  var feature = /** @type {ol.Feature} */
      (new ol.Feature(new ol.geom.Point(this.clickCoordinate)));
  if (this['address'].length > 0 &&  this['distance'] <= 100) {
    feature.set('label', this['address']);
  } else {
    feature.set('label', this['location'][this.projections_['EPSG:2169']]);
  }
  this.appRouting_.addRoutePoint(feature);
  this['routingOpen'] = true;
};

/**
 * @param {MouseEvent|TouchEvent|ol.Coordinate} eventOrCoordinate The event or
 * The coordinate.
 * @private
 */
app.locationinfo.LocationinfoController.prototype.setClickCordinate_ = function(eventOrCoordinate) {
  if (eventOrCoordinate instanceof Array) {
    this.clickCoordinate = eventOrCoordinate;
  } else {
    eventOrCoordinate.preventDefault();
    this.clickCoordinate = this['map'].getEventCoordinate(eventOrCoordinate);
  }
  this.clickCoordinateLuref_ = ol.proj.transform(
    this.clickCoordinate, this['map'].getView().getProjection(), 'EPSG:2169');
  this.clickCoordinate4326_ = ol.proj.transform(
    this.clickCoordinate, this['map'].getView().getProjection(), 'EPSG:4326');
};


/**
 * Load the information panel.
 * @private
 */
app.locationinfo.LocationinfoController.prototype.loadInfoPane_ =
    function() {
      this['appSelector'] = 'locationinfo';
      this.stateManager_.updateState({'crosshair': true});
      this.updateLocation_(this.clickCoordinate);
      var feature = /** @type {ol.Feature} */
      (new ol.Feature(new ol.geom.Point(this.clickCoordinate)));
      this.featureLayer_.getSource().clear();
      this.featureLayer_.getSource().addFeature(feature);

      this.getElevation_(this.clickCoordinate).then(
        function(elevation) {
          this['elevation'] = elevation['formattedElevation'];
          this.rawElevation_ = elevation['rawElevation'];
          if (this.lidarDemoUrl_ !== undefined &&
              this.lidarDemoUrl_.length > 0 && ol.extent.intersects(
                feature.getGeometry().getExtent(), this.lidarExtent_)) {
            this.isInBoxOfLidar = true;
          } else {
            this.isInBoxOfLidar = false;
          }
        }.bind(this)
      );
      this.getShorturl_(this.clickCoordinate).then(goog.bind(
      function(shorturl) {
        this['url'] = shorturl;
        this['qrUrl'] = this.qrServiceUrl_ + '?url=' + shorturl;
      }, this));
      this['address'] = '';
      this['distance'] = '';
      this.geocode_.reverseGeocode(this.clickCoordinate).then(goog.bind(function(resp) {
        if (resp['count'] > 0) {
          var address = resp['results'][0];
          var formattedAddress = address['number'] + ',' + address['street'] + ',' +
          address['postal_code'] + ' ' + address['locality'];
          this['address'] = formattedAddress;
          this['distance'] = Math.round(address['distance']);
        }
      }, this));
    };

/**
 * @return {string} The lidar url.
 * @export
 */
app.locationinfo.LocationinfoController.prototype.getLidarUrl = function() {
  if (this.lidarDemoUrl_ !== undefined && this.lidarDemoUrl_.length > 0 &&
      this.isInBoxOfLidar) {
    return this.lidarDemoUrl_ + '?COORD_X=' +
      this.clickCoordinateLuref_[0] + '&COORD_Y=' +
      this.clickCoordinateLuref_[1] + '&COORD_Z=' +
      parseInt(this.rawElevation_ / 100, 0);
  }
  return '';
};

/**
 * @param {string} dest The destination parameter .
 * @return {*} The url to mobility from field.
 * @export
 */
app.locationinfo.LocationinfoController.prototype.getMobilityUrl = function(dest) {
  if (this.clickCoordinate4326_ !== undefined) {
    var poi = 'POI%20G%C3%A9oportail';
    if (this['address'].length > 0 &&  this['distance'] <= 20) {
      poi = this['address'];
    }
    var baseUrl = 'http://travelplanner.mobiliteit.lu/hafas/cdt/query.exe/fn?';
    return this.sce_.trustAsResourceUrl(baseUrl + dest + '=A=2@O=' +
      poi + '@X=' +
      Math.floor(this.clickCoordinate4326_[0] * 1000000) + '@Y=' +
      Math.floor(this.clickCoordinate4326_[1] * 1000000));
  }
  return undefined;
};

/**
 * @return {boolean} True if is active.
 * @export
 */
app.locationinfo.LocationinfoController.prototype.isStreetviewActive = function() {
  return this.appActivetool_.streetviewActive;
};

/**
 * Change the status of streetview widget.
 * @export
 */
app.locationinfo.LocationinfoController.prototype.toggleStreetview = function() {
  this.appActivetool_.streetviewActive = !this.appActivetool_.streetviewActive;
};


app.module.controller('AppLocationinfoController', app.locationinfo.LocationinfoController);
