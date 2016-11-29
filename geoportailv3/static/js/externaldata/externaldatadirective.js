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
goog.require('app.ShowLayerinfo');
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
 * @param {app.ShowLayerinfo} appShowLayerinfo app.ShowLayerinfo service.
 * @param {string} predefinedWmsUrl URL to the predefined wms service.
 * @param {string} appWmsTreeTemplateUrl Url to measure template
 * @constructor
 * @export
 * @ngInject
 */
app.ExternalDataController = function(gettextCatalog, $http, appWmsHelper,
    appShowLayerinfo, predefinedWmsUrl, appWmsTreeTemplateUrl) {
  /**
   * @type {string}
   * @private
   */
  this.appWmsTreeTemplateUrl_ = appWmsTreeTemplateUrl;

  /**
   * @type {string}
   * @private
   */
  this.predefinedWmsUrl_ = predefinedWmsUrl;

  /**
   * @type {app.ShowLayerinfo}
   * @private
   */
  this.showLayerInfo_ = appShowLayerinfo;

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
   * @type {Array<Object<string,string>>}
   */
  this.wmsUrls = [];

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
  this.accessConstraintsService = '';

  this.loadWmsUrls();
};


/**
 * @return {Array<Object>} An array of predefined wms url.
 * @export
 */
app.ExternalDataController.prototype.getWmsUrls = function() {
  return this.wmsUrls;
};


/**
 * Loads and update the list of predefined wms list.
 * @export
 */
app.ExternalDataController.prototype.loadWmsUrls = function() {
  this.$http_.get(this.predefinedWmsUrl_).then(function(result) {
    this.wmsUrls = result.data;
  }.bind(this));
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
  this.curWmsUrl = wms;
  this.layers = [];
  this.abstractService = this.gettextCatalog.getString('Connexion au WMS distant');
  this.accessConstraintsService = '';
  this.appWmsHelper_.getCapabilities(wms).then(function(capabilities) {
    this.appWmsHelper_.getLayers(wms).then(function(layers) {
      this.layers = layers;
    }.bind(this));
    if ('Abstract' in capabilities['Service']) {
      this.abstractService = capabilities['Service']['Abstract'];
    } else {
      this.abstractService = '';
    }
    if ('AccessConstraints' in capabilities['Service']) {
      this.accessConstraintsService = capabilities['Service']['AccessConstraints'];
    } else {
      this.accessConstraintsService = '';
    }
  }.bind(this));
};


/**
 * @return {string} The predefined wms url.
 * @export
 */
app.ExternalDataController.prototype.getCurWms = function() {
  if (this.curWmsUrl && this.curWmsUrl.length > 0) {
    return this.curWmsUrl;
  }
  return '';
};


/**
 * @return {string} The template.
 * @export
 */
app.ExternalDataController.prototype.getWmsTreeTemplate = function() {
  return this.appWmsTreeTemplateUrl_;
};


/**
 * @param {Object} layer The selected layer.
 * @return {boolean} return true if added to the map.
 * @export
 */
app.ExternalDataController.prototype.addWmsLayers = function(layer) {

  this.appWmsHelper_.addWmsLayers(this.map_, layer);
  return true;
};


/**
 * @param {Object} curLayer The selected layer.
 * @return {Array} return child layers.
 * @export
 */
app.ExternalDataController.prototype.getChildLayers = function(curLayer) {
  if ('Layer' in curLayer) {
    return curLayer['Layer'];
  }
  return [];
};

/**
 * @param {string} property The property to check.
 * @param {Object} curLayer The layer to check.
 * @return {boolean} return true if the property exists.
 * @export
 */
app.ExternalDataController.prototype.hasProperty = function(
    property, curLayer) {
  if (property in curLayer && curLayer[property].length > 0) {
    return true;
  }
  return false;
};


/**
 * @param {string} value The property to trim.
 * @return {string} return the string.
 * @export
 */
app.ExternalDataController.prototype.trim = function(value) {
  if (value !== null && value !== undefined) {
    return value.trim();
  }
  return '';
};


/**
 * @param {string} layerId The id of the layer to check.
 * @return {boolean} return true if the layer is already added.
 * @export
 */
app.ExternalDataController.prototype.isLayerActive = function(layerId) {
  var layer = goog.array.find(this.map_.getLayers().getArray(), function(layer, i) {
    if (layer.get('queryable_id') === layerId) {
      return true;
    }
    return false;
  }, this);
  if (layer) {
    return true;
  }
  return false;
};


/**
 * @param {Object} rawLayer The layer to add or remove from the map.
 * @export
 */
app.ExternalDataController.prototype.toggleWmsLayer = function(rawLayer) {
  var layer = goog.array.find(this.map_.getLayers().getArray(), function(layer, i) {
    if (layer.get('queryable_id') === rawLayer['id']) {
      return true;
    }
    return false;
  }, this);
  if (layer) {
    this.map_.removeLayer(layer);
  } else {
    this.addWmsLayers(rawLayer);
  }
};


/**
 * @param {Object} rawLayer The layer to add or remove from the map.
 * @export
 */
app.ExternalDataController.prototype.getInfo = function(rawLayer) {
  var layer = goog.array.find(this.map_.getLayers().getArray(), function(layer, i) {
    if (layer.get('queryable_id') === rawLayer['id']) {
      return true;
    }
    return false;
  }, this);
  if (layer) {
    this.showLayerInfo_(/** @type {ol.layer.Layer} */ (layer));
  } else {
    this.showLayerInfo_(this.appWmsHelper_.createWmsLayers(this.map_, rawLayer));
  }
};


app.module.controller('AppExternalDataController', app.ExternalDataController);
