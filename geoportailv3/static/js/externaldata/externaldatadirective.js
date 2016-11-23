/**
 * @fileoverview This file provides a external data directive. This directive
 * is used to create a external data panel in the page.
 *
 * Example:
 *
 * <app-external-data app-external-data-map="::mainCtrl.map"></app-external-data>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */
goog.provide('app.ExternalDataController');
goog.provide('app.externalDataDirective');

goog.require('app');
goog.require('app.WmsHelper');

goog.require('ol.format.WMSCapabilities');


/**
 * @param {string} appExternalDataTemplateUrl Url to measure template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.externalDataDirective = function(appExternalDataTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appExternalDataMap'
    },
    controller: 'AppExternalDataController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appExternalDataTemplateUrl
  };
};


app.module.directive('appExternalData', app.externalDataDirective);


/**
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {angular.$http} $http The angular http service.
 * @param {app.WmsHelper} appWmsHelper The wms herlper service.
 * @constructor
 * @export
 * @ngInject
 */
app.ExternalDataController = function(gettextCatalog, $http, appWmsHelper) {

  /**
   * @type {app.WmsHelper}
   * @private
   */
  this.appWmsHelper_ = appWmsHelper;

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = this['map'];

  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

  /**
   * @export
   * @type {boolean}
   */
  this.addExternalDataShownHidden = false;

  /**
   * @export
   * @type {Array<Object>}
   */
  this.wmsUrls = [{
    'url': 'http://ws.geoportail.lu/natura2000',
    'label': 'Natura 2000'},
    {'url': 'http://ws.geoportail.lu/250k',
    'label': '250 K'},
    {'url': 'http://ws.geoportail.lu/1000k',
    'label': '1000 K'},
    {'url': 'http://image.discomap.eea.europa.eu/arcgis/services/Corine/CHA2006/MapServer/WMSServer',
    'label': 'Land Cover Change between year2000 and 2006'},
    {'url': 'http://image.discomap.eea.europa.eu/arcgis/services/Corine/CHA2000/MapServer/WMSServer',
     'label': 'Land Cover Change between year 1990 and 2000'},
    {'url': 'http://copernicus.discomap.eea.europa.eu/arcgis/services/Elevation/Aspect/MapServer/WMSServer',
     'label': 'Aspect,Elevation,Copernicus,Copernicus Land'},
    {'url': 'http://copernicus.discomap.eea.europa.eu/arcgis/services/Elevation/DEM_v_1_1/MapServer/WMSServer',
     'label': 'EU-DEM v1.0 is a digital surface model (DSM) of EEA39 countries representing the first surface as illuminated by the sensors.'},
    {'url': 'http://wmts1.geoportail.lu/opendata/service',
     'label': 'BD-L-ORTHO - Open Data Webservices WMS'}
    ];

  /**
   * @export
   * @type {string}
   */
  this.curWmsUrl = '';

  /**
   * @export
   * @type {Array<Object>}
   */
  this.versionList = [
    {'version': '1.3.0',
     'defaultGetCapabilities': 'SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0'}
  ];

  /**
   * @export
   * @type {Array<Object>}
   */
  this.layers = [];

  /**
   * @export
   * @type {string}
   */
  this.abstractService = '';

  /**
   * @export
   * @type {string}
   */
  this.layerDescription = '';

  /**
   * @private
   * @type {Array<string>}
   */
  this.imageFormats_ = [];
};


/**
 * @return {Array<Object>} An array of predefined wms url.
 * @export
 */
app.ExternalDataController.prototype.getWmsUrls = function() {
  return this.wmsUrls;
};

/**
 * @return {Array<Object>} An array of layers comming from remote wms.
 * @export
 */
app.ExternalDataController.prototype.getLayers = function() {
  return this.layers;
};

/**
 * @param {string} wms The url of the wms.
 * @export
 */
app.ExternalDataController.prototype.refreshWmsLayers = function(wms) {
  this.layerDescription = '';
  this.curWmsUrl = wms;
  this.layers = [];

  this.appWmsHelper_.getCapabilities(wms).then(function(capabilities) {
    this.appWmsHelper_.getLayers(wms).then(function(layers) {
      this.layers = layers;
    }.bind(this));
    this.imageFormats_ = capabilities['Capability']['Request']['GetMap']['Format'];
    this.abstractService = capabilities['Service']['Abstract'];
  }.bind(this));
};


/**
 * @return {string} An array of predefined wms url.
 * @export
 */
app.ExternalDataController.prototype.getCurWms = function() {
  if (this.curWmsUrl && this.curWmsUrl.length > 0) {
    return this.curWmsUrl;
  }
  return '';
};

/**
 * @param {Object} layer The selected layer.
 * @return {boolean} return true if added to the map.
 * @export
 */
app.ExternalDataController.prototype.addWmsLayers = function(layer) {

  var hasPng = false;
  var hasJpeg = false;
  var imageFormat = this.imageFormats_[0];
  goog.array.forEach(this.imageFormats_, function(format) {
    if (format.toUpperCase().indexOf('PNG') !== -1) {
      hasPng = true;
    }
    if (format.toUpperCase().indexOf('JPEG') !== -1) {
      hasJpeg = true;
    }
  }, this);
  if (hasPng) {
    imageFormat = 'image/png';
  } else if (hasJpeg) {
    imageFormat = 'image/jpeg';
  }
  this.appWmsHelper_.addWmsLayers(this.map_, imageFormat, layer);
  return true;
};

app.module.controller('AppExternalDataController', app.ExternalDataController);
