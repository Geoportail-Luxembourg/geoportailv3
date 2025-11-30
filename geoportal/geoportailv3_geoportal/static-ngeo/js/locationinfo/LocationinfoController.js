/**
 * @module app.locationinfo.LocationinfoController
 */
/**
 * @fileoverview This file provides a "location information" directive.
 */

import appModule from '../module.js';
import olFeature from 'ol/Feature.js';
import {listen} from 'ol/events.js';
import olGeomPoint from 'ol/geom/Point.js';
import olLayerVector from 'ol/layer/Vector.js';
import {transform, transformExtent} from 'ol/proj.js';
import olSourceVector from 'ol/source/Vector.js';
import olStyleCircle from 'ol/style/Circle.js';
import olStyleFill from 'ol/style/Fill.js';
import olStyleStroke from 'ol/style/Stroke.js';
import olStyleStyle from 'ol/style/Style.js';
import olMapBrowserEventType from 'ol/MapBrowserEventType.js';
import {intersects} from 'ol/extent.js';
import { urlStorage } from "luxembourg-geoportail/bundle/lux.dist.js";

/**
 * @constructor
 * @param {angular.Scope} $scope The scope.
 * @param {angular.$timeout} $timeout The timeout service.
 * @param {angular.$http} $http The Angular $http service.
 * @param {app.GetShorturl} appGetShorturl The short url service.
 * @param {app.GetElevation} appGetElevation The elevation service.
 * @param {app.CoordinateString} appCoordinateString The coordinate to string
 * service.
 * @param {app.StateManager} appStateManager The state manager service.
 * @param {string} qrServiceUrl The qr service url.
 * @param {app.draw.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {app.Geocoding} appGeocoding appGeocoding The geocoding service.
 * @param {app.GetDevice} appGetDevice The device service.
 * @param {app.Themes} appThemes The themes service.
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode The layer
 * @param {ol.Extent} bboxLidar Bbox of lidar.
 * @param {string} bboxSrsLidar Bbox srs of lidar.
 * @param {string} lidarDemoUrl Url to the demo of lidar.
 * @param {app.Routing} appRouting The routing service.
 * @param {angular.$sce} $sce Angular $sce service.
 * @param {app.Activetool} appActivetool The activetool service.
 * @param {app.UserManager} appUserManager
 * @ngInject
 */
const exports = function(
        $scope, $timeout, $http,
        appGetShorturl, appGetElevation, appCoordinateString, appStateManager,
        qrServiceUrl, appSelectedFeatures,
        appGeocoding, appGetDevice, appThemes,
        appGetLayerForCatalogNode, bboxLidar, bboxSrsLidar, lidarDemoUrl,
        appRouting, $sce, appActivetool, appUserManager) {

  this.scope_ = $scope;
  this.bboxLidar_ = bboxLidar;

  this.bboxSrsLidar_ = bboxSrsLidar;

  this.appSelectedFeatures_ = appSelectedFeatures;

  this.timeout_ = $timeout;

  this.http_ = $http;
  /**
   * @type {app.UserManager}
   * @private
   */
  this.appUserManager_ = appUserManager;

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
  this.featureLayer_ = new olLayerVector({
    source: new olSourceVector(),
    zIndex: 1000,
    'altitudeMode': 'clampToGround'
  });
  var defaultFill = new olStyleFill({
    color: [255, 255, 0, 0.6]
  });
  var circleStroke = new olStyleStroke({
    color: [255, 155, 55, 1],
    width: 3
  });

  var pointStyle = new olStyleCircle({
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
      return [new olStyleStyle({
        image: pointStyle
      })];
    });

  $scope.$watch(function() {
    return this['appSelector'];
  }.bind(this), function(newVal) {
    if (newVal != 'locationinfo') {
      this.featureLayer_.getSource().clear();
    }
  }.bind(this));

  $scope.$watch(function() {
    return this['open'];
  }.bind(this), function(newVal, oldVal) {
    if (newVal == oldVal) {
      return;
    }
    if (newVal === false) {
      this.appActivetool_.streetviewActive = false;
      this['hiddenContent'] = false;
      this.stateManager_.updateState({'crosshair': false});
      var mapCenterCoordinate = this.map_.getView().getCenter();
      this.stateManager_.updateState({
        'X': parseInt(mapCenterCoordinate[0], 0),
        'Y': parseInt(mapCenterCoordinate[1], 0)
      });
      this['appSelector'] = undefined;
      this['location'] = {};
      this.featureLayer_.getSource().clear();
    }
  }.bind(this));

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
  this.startPixel = null;

  /**
   * @type {angular.$q.Promise|undefined}
   */
  this.holdPromise;

  /**
   * @type {ol.Coordinate}
   * @export
   */
  this.clickCoordinate = null;

  /**
   * @type {boolean}
   * @export
   */
  this.downloadingRepport = false;
  
  $scope.$watch(function() {
    return this.clickCoordinate;
  }.bind(this), function(newVal, oldVal) {
    if (newVal == oldVal) {
      return;
    }
    this.loadInfoPane_();
  }.bind(this));
};


exports.prototype.$onInit = function() {
  this.map_ = this['map'];

  this.lidarExtent_ = transformExtent(this.bboxLidar_, this.bboxSrsLidar_, this.map_.getView().getProjection());

  this.map_.addLayer(this.featureLayer_);

  // Load infowindow if crosshair variable is set
  var urlLocationInfo = this.stateManager_.getInitialValue('crosshair');
  if (urlLocationInfo !== undefined &&  urlLocationInfo !== null &&
      urlLocationInfo === 'true') {
    var x = this.stateManager_.getInitialValue('X');
    var y = this.stateManager_.getInitialValue('Y');
    var version = this.stateManager_.getVersion();
    var srs = this.stateManager_.getInitialValue('SRS');
    if (srs === undefined) {
      if (version === 3) {
        srs = 'EPSG:3857';
      } else {
        srs = 'EPSG:2169';
      }
    }
    if (x !== undefined && y !== undefined) {
      try {
        var coordinate = version === 3 ?
            /** @type {ol.Coordinate} */ (transform([parseFloat(x), parseFloat(y)], srs,
                this['map'].getView().getProjection())) :
            /** @type {ol.Coordinate} */ (transform([parseFloat(y), parseFloat(x)], srs,
                this['map'].getView().getProjection()));
        this.setClickCordinate_(coordinate);
        this.loadInfoPane_();
        if (!this.appGetDevice_.testEnv('xs')) {
          this['open'] = true;
          this['hiddenContent'] = false;
        } else {
          this['hiddenContent'] = true;
        }
      } catch(exception) {
        console.error(exception);
      }
    }
  }

  if (urlStorage.getItem('address') != null) {
    this.appThemes_.getFlatCatalog().then(function(flatCatalog) {
      var node = flatCatalog.find(
        function(catalogLayer) {
          return catalogLayer['name'] === 'addresses';
        }, this);
      if (node !== undefined && node  !== null) {
        var layer = this.getLayerFunc_(node);
        if (this.map_.getLayers().getArray().indexOf(layer) <= 0) {
          this.map_.addLayer(layer);
        }
      }
    }.bind(this));
    var address = urlStorage.getItem('address')
    console.assert(address !== null);
    this.geocode_.geocode(/** @type{string} */ (address)).then(function(data) {
      var results = data['results'];
      if (results !== undefined && results.length > 0) {
        var coordinates = /** @type {ol.Coordinate} */
            (transform(
                results[0]['geom']['coordinates'], 'EPSG:2169',
                this.map_.getView().getProjection()));
        this.map_.getView().setZoom(17);
        this.map_.getView().setCenter(coordinates);
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


  listen(this.map_, olMapBrowserEventType.POINTERDOWN, function(event) {
    if (!this.appSelectedFeatures_.getLength()) {
      if (event.originalEvent.which === 3) { // if right mouse click
        this.setClickCordinate_(event.originalEvent);
        this['open'] = true;
        this.openInPointerDown_ = true;
        this.scope_.$digest();
      } else if (event.originalEvent.pointerType == "touch") {
        this.timeout_.cancel(this.holdPromise);
        this.startPixel = event.pixel;
        var that = this;
        this.holdPromise = this.timeout_(function() {
          that.setClickCordinate_(event.originalEvent);
          that['open'] = true;
          that.scope_.$digest();
        }, 500, false);
      }
    }
  }.bind(this), this);

  listen(this.map_, olMapBrowserEventType.POINTERUP,
    function(event) {
      this.timeout_.cancel(this.holdPromise);
      this.startPixel = null;
    }.bind(this), this);

  listen(this.map_, 'pointermove',
    function(event) {
      if (this.startPixel) {
        var pixel = event.pixel;
        var deltaX = Math.abs(this.startPixel[0] - pixel[0]);
        var deltaY = Math.abs(this.startPixel[1] - pixel[1]);
        if (deltaX + deltaY > 6) {
          this.timeout_.cancel(this.holdPromise);
          this.startPixel = null;
        }
      }
    }.bind(this), this);

  this.map_.getViewport().addEventListener('contextmenu', function(event) {
    event.preventDefault(); // disable right-click menu on browsers
    if (!this.openInPointerDown_) {
      this.setClickCordinate_(event);
      this['open'] = true;
    }
    this.openInPointerDown_ = false;
  }.bind(this));
}


/**
 * @param {ol.Coordinate} coordinate The coordinate.
 * @private
 */
exports.prototype.updateLocation_ = function(coordinate) {
  this['location'] = {};
  for (var key in this.projections_) {
    var value = this.projections_[key];
    var sourceEpsgCode = this.map_.getView().getProjection().getCode();
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
  }
};

/**
 * @return {string} The url.
 * @export
 */
exports.prototype.getRapportForageVirtuelUrl = function() {
  var coordX = Math.round(this.clickCoordinateLuref_[0], 1);
  var coordY = Math.round(this.clickCoordinateLuref_[1], 1);
  return "/getRapportForageVirtuel?x="+coordX+"&y="+coordY;
}

/**
 * @return {boolean} True if we want to show cyclomedia button.
 * @export
 */
exports.prototype.isRapportForageVirtuelAvailable = function() {
  if (this.appUserManager_.getRole() == 'ACT') {
    return true;
  }
  return false;
};

/**
 * @return {string} The url.
 * @export
 */
exports.prototype.downloadRapportForageVirtuel = function() {
  this.map_.getViewport().style.cursor = 'wait';
  document.body.style.cursor = 'wait';
  this.downloadingRepport = true;
  var url = this.getRapportForageVirtuelUrl();
  this.http_.get(url, { responseType: 'blob' })
    .then(function(response) {
      var blob = new Blob([response.data], { type: response.headers('Content-Type') });
      var downloadUrl = URL.createObjectURL(blob);
      var anchor = angular.element('<a></a>');
      anchor.attr({
        href: downloadUrl,
        download: ''
      });
      anchor[0].click();
      URL.revokeObjectURL(downloadUrl);
      this.map_.getTargetElement().style.cursor = '';
      document.body.style.cursor = '';
      this.downloadingRepport = false;
    }.bind(this))
    .catch(function(error) {
      // La requête a échoué
      console.log(error);
      this.map_.getTargetElement().style.cursor = '';
      document.body.style.cursor = '';
      this.downloadingRepport = false;
    }.bind(this));;
}

/**
 * @export
 */
exports.prototype.addRoutePoint = function() {
  var feature = /** @type {ol.Feature} */
      (new olFeature(new olGeomPoint(this.clickCoordinate)));
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
exports.prototype.setClickCordinate_ = function(eventOrCoordinate) {
  if (eventOrCoordinate instanceof Array) {
    this.clickCoordinate = [parseInt(eventOrCoordinate[0]), parseInt(eventOrCoordinate[1])];
  } else {
    eventOrCoordinate.preventDefault();
    this.clickCoordinate = this.map_.getEventCoordinate(eventOrCoordinate);
  }
  this.clickCoordinateLuref_ = transform(
    this.clickCoordinate, this.map_.getView().getProjection(), 'EPSG:2169');
  this.clickCoordinate4326_ = transform(
    this.clickCoordinate, this.map_.getView().getProjection(), 'EPSG:4326');
};


/**
 * Load the information panel.
 * @private
 */
exports.prototype.loadInfoPane_ =
    function() {
      this['appSelector'] = 'locationinfo';
      this.stateManager_.updateState({'crosshair': true});
      this.updateLocation_(this.clickCoordinate);
      var feature = /** @type {ol.Feature} */
      (new olFeature(new olGeomPoint(this.clickCoordinate)));
      this.featureLayer_.getSource().clear();
      this.featureLayer_.getSource().addFeature(feature);
      if (this.map_.getLayers().getArray().indexOf(this.featureLayer_) === -1) {
        this.map_.addLayer(this.featureLayer_);
      }
      this.getElevation_(this.clickCoordinate).then(
        function(elevation) {
          this['elevation'] = elevation['formattedElevation'];
          this.rawElevation_ = elevation['rawElevation'];
          if (this.lidarDemoUrl_ !== undefined &&
              this.lidarDemoUrl_.length > 0 && intersects(
                feature.getGeometry().getExtent(), this.lidarExtent_)) {
            this.isInBoxOfLidar = true;
          } else {
            this.isInBoxOfLidar = false;
          }
        }.bind(this)
      );
      this.getShorturl_(this.clickCoordinate).then(function(shorturl) {
        this['url'] = shorturl.short_url;
        this['qrUrl'] = this.qrServiceUrl_ + '?url=' + shorturl.short_url;
      }.bind(this));
      this['address'] = '';
      this['distance'] = '';
      this.geocode_.reverseGeocode(this.clickCoordinate).then(function(resp) {
        if (resp['count'] > 0) {
          var address = resp['results'][0];
          var formattedAddress = address['number'] + ',' + address['street'] + ',' +
          address['postal_code'] + ' ' + address['locality'];
          this['address'] = formattedAddress;
          this['distance'] = Math.round(address['distance']);
        }
      }.bind(this));
    };

/**
 * @return {string} The lidar url.
 * @export
 */
exports.prototype.getLidarUrl = function() {
  if (this.lidarDemoUrl_ !== undefined && this.lidarDemoUrl_.length > 0 &&
      this.isInBoxOfLidar) {
    return this.lidarDemoUrl_ + '?COORD_X=' +
      this.clickCoordinateLuref_[0] + '&COORD_Y=' +
      this.clickCoordinateLuref_[1] + '&COORD_Z=' +
      parseInt(this.rawElevation_ / 1, 0);
  }
  return '';
};


/**
 * @return {boolean} True if we want to show cyclomedia button.
 * @export
 */
exports.prototype.isCyclomediaAvailable = function() {
  if (this.appUserManager_.getUserType() == 'etat' ||
      this.appUserManager_.getUserType() == 'commune' ||
      this.appUserManager_.getRole() == 'MinTour') {
    return true;
  }
  return false;
};


/**
 * @return {string} The cyclomedia url.
 * @export
 */
exports.prototype.getCyclomediaUrl = function() {
  if (this.clickCoordinateLuref_ !== undefined) {
  return 'http://streetsmart.cyclomedia.com/streetsmart?q=' +
          this.clickCoordinateLuref_[0] + ';' +
          this.clickCoordinateLuref_[1];
  }
  return undefined;
};

/**
 * @return {string} The streetview url.
 * @export
 */
exports.prototype.getStreetviewUrl = function() {
  if (this.clickCoordinate4326_ !== undefined) {
  return 'https://www.google.com/maps/@?' +
  'api=1&map_action=pano&viewpoint='+this.clickCoordinate4326_[1]+','+this.clickCoordinate4326_[0]+'&heading=0&pitch=0&fov=90'
  }
  return undefined;
};

/**
 * @return {boolean} True if we want to show Images Obliques button.
 * @export
 */
exports.prototype.isImagesObliquesAvailable = function() {
  return true;
};


/**
 * @return {string} The image oblique url.
 * @export
 */
exports.prototype.getOldImagesObliquesUrl = function() {
  if (this.clickCoordinateLuref_ !== undefined) {
    return 'https://oblique.geoportail.lu/publication/viewer?x='+this.clickCoordinateLuref_[0]+'&y='+this.clickCoordinateLuref_[1]+'&crs=2169';
  }
  return undefined;
};

/**
 * @return {string} The image oblique url.
 * @export
 */
exports.prototype.getImagesObliquesUrl = function() {
  if (this.clickCoordinate4326_ === undefined) {
    return undefined;
  }
  
  const lon = this.clickCoordinate4326_[0];
  const lat = this.clickCoordinate4326_[1];
  
  // Fixed parameters for oblique viewer
  const elevation = 692;  // Camera altitude
  const targetHeight = 292;  // Target height
  const distance = 400;  // Distance from target
  const heading = 0;  // North orientation
  const pitch = -90;  // Looking straight down
  const roll = 0;  // No roll
  
  // Modules (UUIDs for oblique viewer plugins)
  const modules = [
    "LuxConfig",
    "8bbdc4b3-691e-466e-9e91-2b0d57a9a53e",
    "c627c247-8017-483a-a32e-1ff0ad5f0536",
    "0fa7c853-d866-486c-8c2d-3470f401d44c",
    "1f9cb759-c3dc-44ba-9253-7299701499a3",
    "f7791a73-5132-4282-b3c4-1adb1abce06a",
    "catalogConfig"
  ];
  
  // Layers (empty for oblique viewer)
  const layers = [];
  
  // Plugins configuration
  const plugins = [
    ["@geoportallux/lux-3dviewer-themesync", {"prop": "*"}],
    ["@geoportallux/lux-3dviewer-plugin-back-to-2d-portal", {"prop": "*"}]
  ];
  
  // Oblique imagery dataset
  const obliqueDataset = "ACT2023_ImagesObliques_all";
  
  // Build VCS state
  const state = [
    [
      [lon, lat, elevation],
      [lon, lat, targetHeight],
      distance,
      heading,
      pitch,
      roll
    ],
    "Oblique Map",
    modules,
    layers,
    [],
    plugins,
    obliqueDataset,
    []
  ];
  
  // Encode state and build URL
  return 'https://3d.geoportail.lu/?state=' + encodeURIComponent(JSON.stringify(state));
};

/**
 * @param {string} dest The destination parameter .
 * @return {*} The url to mobility from field.
 * @export
 */
exports.prototype.getMobilityUrl = function(dest) {
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
exports.prototype.isStreetviewActive = function() {
  return this.appActivetool_.streetviewActive;
};

/**
 * Change the status of streetview widget.
 * @export
 */
exports.prototype.toggleStreetview = function() {
  this.appActivetool_.streetviewActive = !this.appActivetool_.streetviewActive;
};


appModule.controller('AppLocationinfoController', exports);


export default exports;
