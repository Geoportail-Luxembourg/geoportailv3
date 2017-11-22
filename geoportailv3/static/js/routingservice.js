/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "routing" web service.
 */
goog.provide('app.Routing');

goog.require('app');
goog.require('ol.proj');


/**
 * @constructor
 * @param {angular.$http} $http The Angular $http service.
 * @param {string} routingServiceUrl The url of the service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {ngeo.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay?
 * @ngInject
 */
app.Routing = function($http, routingServiceUrl, gettextCatalog,
    ngeoFeatureOverlayMgr) {
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
   * @type {ngeo.FeatureOverlay}
   */
  this.routeOverlay = ngeoFeatureOverlayMgr.getFeatureOverlay();

  /**
   * @type {ol.Collection<ol.Feature>}
   */
  this.routeFeatures = new ol.Collection();
  this.routeOverlay.setFeatures(this.routeFeatures);

  /**
   * @type {ngeo.FeatureOverlay}
   */
  this.stepsOverlay = ngeoFeatureOverlayMgr.getFeatureOverlay();

  /**
   * @type {ol.Collection<ol.Feature>}
   */
  this.stepFeatures = new ol.Collection();
  this.stepsOverlay.setFeatures(this.stepFeatures);

  /**
   * @type {ngeo.FeatureOverlay}
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
      var idx = 1;
      this.features.forEach(function(curFeature) {
        curFeature.set('__text', '' + idx);
        idx++;
      }, this);
    }
  }
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
      fill: fillStyle,
      stroke: strokeStyle,
      image: new ol.style.Circle({
        radius: 15,
        fill: fillStyle,
        stroke: strokeStyle
      })
    }));
    var text = this.get('__text');
    if (text === undefined) {
      text = '';
    }
    styles.push(new ol.style.Style({
      text: new ol.style.Text(/** @type {olx.style.TextOptions} */ ({
        text: text,
        textAlign: 'center',
        font: 'normal 10px Sans-serif',
        fill: new ol.style.Fill({
          color: [0, 0, 0]
        }),
        stroke: new ol.style.Stroke({
          color: [255, 255, 255],
          width: 2
        })
      }))
    }));
    return styles;
  });

  feature.set('__text', '' + routeNumber);
  var featuresLength = this.features.getLength();
  if (routeNumber > featuresLength) {
    var j;
    for (j = featuresLength; j < routeNumber; ++j) {
      var blankFeature = new ol.Feature();
      blankFeature.set('__text', '' + j);
      this.features.insertAt(j, blankFeature);
    }
  }
  this.features.setAt(routeNumber - 1, feature);
};

/**
 * Get the route
 */
app.Routing.prototype.getRoute = function() {
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
            this.routeFeatures.push(feature);
          }.bind(this));
        }
      }
    }.bind(this));
  }
};


app.module.service('appRouting', app.Routing);
