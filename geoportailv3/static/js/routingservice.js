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
      this.features.insertAt(j, blankFeature);
    }
  }
  this.features.setAt(routeNumber - 1, feature);
};

/**
 * @param {string} waypoints The waypoints.
 * @param {number} criteria The critria 0: fastest, 1:shortest.
 * @param {number} transportMode The transport mode.
 * @return {!angular.$q.Promise} Promise providing the reverse geocode.
 */
app.Routing.prototype.getRoute = function(waypoints, criteria, transportMode) {
  var currentLanguage = this.gettextCatalog.currentLanguage;

  return this.$http_.get(this.routingServiceUrl_, {
    params: {
      'criteria': criteria,
      'lang': currentLanguage,
      'transportMode': transportMode,
      'waypoints': waypoints,
      'avoid': ''
    }
  }).then(
      /**
         * @param {angular.$http.Response} resp Ajax response.
         * @return {Object} The response
         */
          function(resp) {
            return resp['data'];
          });
};


app.module.service('appRouting', app.Routing);
