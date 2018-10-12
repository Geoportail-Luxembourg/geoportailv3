/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "routing" web service.
 */
goog.provide('app.Routing');

goog.require('app.module');
goog.require('ol');
goog.require('ol.style');
goog.require('ol.geom');
goog.require('ol.format');


/**
 * @constructor
 * @param {angular.$http} $http The Angular $http service.
 * @param {string} routingServiceUrl The url of the service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {ngeo.map.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay?
 * @param {app.StateManager} appStateManager The state manager service.
 * @ngInject
 */
app.Routing = function($http, routingServiceUrl, gettextCatalog,
    ngeoFeatureOverlayMgr, appStateManager) {
  /**
   * @type {app.StateManager}
   * @private
   */
  this.stateManager_ = appStateManager;

  /**
   * @type {ol.style.Style}
   * @private
   */
  this.roadStyle_ = new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: [255, 0, 0],
      width: 5
    })
  });

  /**
   * @type {Array<number>}
   * @export
   */
  this.routesOrder = [0, 1];

  /**
   * @type {ol.Map}
   */
  this.map;

  /**
   * @type {number}
   */
  this.criteria = 0;

  /**
   * @type {number}
   */
  this.transportMode = 0;

  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

  /**
   * @type {string}
   * @private
   */
  this.routingServiceUrl_ = routingServiceUrl;

  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

  /**
   * @type {ngeo.map.FeatureOverlay}
   */
  this.routeOverlay = ngeoFeatureOverlayMgr.getFeatureOverlay();

  /**
   * @type {ol.Collection<ol.Feature>}
   */
  this.routeFeatures = new ol.Collection();
  this.routeOverlay.setFeatures(this.routeFeatures);

  /**
   * @type {ngeo.map.FeatureOverlay}
   */
  this.stepsOverlay = ngeoFeatureOverlayMgr.getFeatureOverlay();
  var fillStyle = new ol.style.Fill({
    color: [41, 128, 185]
  });

  var strokeStyle = new ol.style.Stroke({
    color: [255, 255, 255],
    width: 3
  });

  /**
   * @type {ol.style.Style}
   * @private
   */
  this.stepStyle_ = new ol.style.Style({
    fill: fillStyle,
    zIndex: 0,
    stroke: strokeStyle,
    image: new ol.style.Circle({
      radius: 7,
      fill: fillStyle,
      stroke: strokeStyle
    })
  });


  /**
   * @type {ol.Collection<ol.Feature>}
   */
  this.stepFeatures = new ol.Collection();
  this.stepsOverlay.setFeatures(this.stepFeatures);
  this.stepsOverlay.setStyle(this.stepStyle_);

  /**
   * @type {ngeo.map.FeatureOverlay}
   */
  this.routingOverlay = ngeoFeatureOverlayMgr.getFeatureOverlay();

  /**
   * @type {ol.Collection<ol.Feature>}
   */
  this.features = new ol.Collection();
  this.routingOverlay.setFeatures(this.features);

  /**
   * @type {Array<string>}
   * @export
   */
  this.routes = ['', ''];
};

/**
 * @param {number} fromPosition The position.
 * @param {number} toPosition The position.
 */
app.Routing.prototype.moveFeaturePosition = function(fromPosition, toPosition) {
  if (this.features.getLength() > fromPosition) {
    var feature = this.features.removeAt(fromPosition);
    if (feature !== undefined) {
      this.features.insertAt(toPosition, feature);
    }
  }
};

/**
 * Reorder the route.
 */
app.Routing.prototype.reorderRoute = function() {
  this.routesOrder.splice(0, this.routesOrder.length);

  var idx = 1;
  this.features.forEach(function(curFeature) {
    this.routesOrder.push(idx - 1);
    if (curFeature.getGeometry() !== undefined) {
      curFeature.set('name', '' + idx);
      idx++;
    }
  }, this);
};

/**
 * @param {ol.Feature} feature The feature to insert.
 * @param {number} routeNumber The position.
 */
app.Routing.prototype.insertFeatureAt = function(feature, routeNumber) {
  feature.setStyle(function() {
    var styles = [];
    var fillStyle = new ol.style.Fill({
      color: [255, 255, 255]
    });

    var strokeStyle = new ol.style.Stroke({
      color: [41, 128, 185],
      width: 3
    });

    styles.push(new ol.style.Style({
      zIndex: 1,
      fill: fillStyle,
      stroke: strokeStyle,
      image: new ol.style.Circle({
        radius: 15,
        fill: fillStyle,
        stroke: strokeStyle
      })
    }));
    var text = this.get('name');
    if (text === undefined) {
      text = '';
    }
    styles.push(new ol.style.Style({
      zIndex: 2,
      text: new ol.style.Text(/** @type {olx.style.TextOptions} */ ({
        text: text,
        textAlign: 'center',
        font: 'normal 10px Sans-serif',
        fill: new ol.style.Fill({
          color: [41, 128, 185]
        }),
        stroke: new ol.style.Stroke({
          color: [255, 255, 255],
          width: 2
        })
      }))
    }));
    return styles;
  });

  feature.set('name', '' + routeNumber);
  var featuresLength = this.features.getLength();
  if (routeNumber > featuresLength) {
    var j;
    for (j = featuresLength; j < routeNumber; ++j) {
      var blankFeature = new ol.Feature();
      blankFeature.set('name', '' + j);
      this.features.insertAt(j, blankFeature);
    }
  }
  this.features.setAt(routeNumber - 1, feature);
};

/**
 * Add a new routing step at the best place.
 * @param {ol.Feature} feature The Feature.
 */
app.Routing.prototype.addRoutePoint = function(feature) {
  var routeNum = -1;
  var i = 0;
  for (i = 0; i < this.routes.length; i++) {
    if (this.routes[i].length === 0) {
      routeNum = i;
      break;
    }
  }
  if (routeNum === -1) {
    routeNum = this.routes.length;
    this.routes.push ('');
    this.routesOrder.push(this.routes.length);
    this.reorderRoute();
  }

  this.routes[routeNum] = /** @type {string} */ (feature.get('label'));
  this.insertFeatureAt(feature, routeNum + 1);
  this.getRoute();
};

/**
 * Get the route
 */
app.Routing.prototype.getRoute = function() {
  this.stateManager_.deleteParam('criteria');
  this.stateManager_.deleteParam('transportMode');
  this.stateManager_.deleteParam('waypoints');
  this.stateManager_.deleteParam('labels');
  this.routeFeatures.clear();
  this.stepFeatures.clear();
  if (this.features.getLength() >= 2) {
    var waypoints = [];
    this.features.forEach(function(feature) {
      var geom = feature.getGeometry();
      if (geom instanceof ol.geom.Point) {
        var lonlat = /** @type {ol.Coordinate} */
            (ol.proj.transform(geom.getFirstCoordinate(),
            'EPSG:3857', 'EPSG:4326'));
        waypoints.push(lonlat[1] + ',' + lonlat[0]);
      }
    }.bind(this));
    if (waypoints.length < 2) {
      return;
    }

    var currentLanguage = this.gettextCatalog.currentLanguage;
    this.stateManager_.updateState({
      'criteria': '' + this.criteria,
      'transportMode': '' + this.transportMode,
      'waypoints': waypoints.join(','),
      'labels': this.routes.join('||')
    });
    this.$http_.get(this.routingServiceUrl_, {
      params: {
        'criteria': this.criteria,
        'lang': currentLanguage,
        'transportMode': this.transportMode,
        'waypoints': waypoints.join(','),
        'avoid': ''
      }
    }).then(function(resp) {
      var features = resp['data'];
      if (features !== null) {
        var curView = this.map.getView();
        var encOpt = /** @type {olx.format.ReadOptions} */ ({
          dataProjection: 'EPSG:4326',
          featureProjection: curView.getProjection()
        });
        var jsonFeatures = (new ol.format.GeoJSON()).
            readFeatures(features, encOpt);
        if (jsonFeatures !== null && jsonFeatures !== undefined) {
          this.routeFeatures.clear();
          // Only one path is returned
          jsonFeatures.forEach(function(feature) {
            feature.setStyle(this.roadStyle_);
            feature.set('name', 'route');
            this.routeFeatures.push(feature);
          }.bind(this));
        }
      }
    }.bind(this));
  }
};


app.module.service('appRouting', app.Routing);
