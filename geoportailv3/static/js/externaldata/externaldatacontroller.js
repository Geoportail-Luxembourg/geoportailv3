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
goog.provide('app.externaldata.ExternalDataController');

goog.require('app.module');
goog.require('goog.array');


/**
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {angular.$http} $http The angular http service.
 * @param {app.WmsHelper} appWmsHelper The wms herlper service.
 * @param {app.WmtsHelper} appWmtsHelper The wms herlper service.
 * @param {app.ShowLayerinfo} appShowLayerinfo app.ShowLayerinfo service.
 * @param {string} predefinedWmsUrl URL to the predefined wms service.
 * @param {string} appWmsTreeTemplateUrl Url to display wms layers.
 * @param {string} appWmtsTreeTemplateUrl Url to display wmts layers.
 * @constructor
 * @export
 * @ngInject
 */
app.externaldata.ExternalDataController = function(gettextCatalog, $http, appWmsHelper,
    appWmtsHelper, appShowLayerinfo, predefinedWmsUrl, appWmsTreeTemplateUrl,
    appWmtsTreeTemplateUrl) {
  /**
   * @type {string}
   * @private
   */
  this.appWmsTreeTemplateUrl_ = appWmsTreeTemplateUrl;

  /**
   * @type {string}
   * @private
   */
  this.appWmtsTreeTemplateUrl_ = appWmtsTreeTemplateUrl;

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
   * @type {app.WmtsHelper}
   * @private
   */
  this.appWmtsHelper_ = appWmtsHelper;

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
  this.curDataUrl = '';

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
  this.wmsLayers = [];

  /**
   * @export
   * @type {Array<Object>}
   */
  this.wmtsLayers = [];

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

  /**
   * @export
   * @type {boolean}
   */
  this.isLoading = false;

  this.loadWmsUrls();
};


/**
 * @return {Array<Object>} An array of predefined wms url.
 * @export
 */
app.externaldata.ExternalDataController.prototype.getWmsUrls = function() {
  return this.wmsUrls;
};


/**
 * Loads and update the list of predefined wms list.
 * @export
 */
app.externaldata.ExternalDataController.prototype.loadWmsUrls = function() {
  this.$http_.get(this.predefinedWmsUrl_).then(function(result) {
    this.wmsUrls = result.data;
  }.bind(this));
};


/**
 * @return {Array<Object>} An array of layers comming from remote wms.
 * @export
 */
app.externaldata.ExternalDataController.prototype.getWmsLayers = function() {
  return this.wmsLayers;
};

/**
 * @return {Array<Object>} An array of layers comming from remote wms.
 * @export
 */
app.externaldata.ExternalDataController.prototype.getWmtsLayers = function() {
  return this.wmtsLayers;
};

/**
 * @param {string} url The url of the service.
 * @export
 */
app.externaldata.ExternalDataController.prototype.detectServiceType = function(url) {
  this.appWmsHelper_.getCapabilities(url).then(function(capabilities) {
    if (capabilities === null) {
      this.appWmtsHelper_.getCapabilities(url).then(function(capabilities) {
        if (capabilities !== null) {
          this.refreshWmtsLayers(this.curDataUrl);
        }
      }.bind(this));
    } else {
      this.refreshWmsLayers(this.curDataUrl);
    }
  }.bind(this));
};

/**
 * @param {string} wms The url of the wms.
 * @export
 */
app.externaldata.ExternalDataController.prototype.refreshWmsLayers = function(wms) {
  this.curDataUrl = wms;
  this.wmsLayers = [];
  this.wmtsLayers = [];
  this.isLoading = true;

  this.abstractService = '';
  this.accessConstraintsService = '';
  this.appWmsHelper_.getCapabilities(wms).then(function(capabilities) {
    if (capabilities === null) {
      return null;
    }
    this.appWmsHelper_.getLayers(wms).then(function(layers) {
      this.wmsLayers = layers;
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
    this.isLoading = false;
  }.bind(this));
};


/**
 * @param {string} wmts The url of the wmts.
 * @export
 */
app.externaldata.ExternalDataController.prototype.refreshWmtsLayers = function(wmts) {
  this.curDataUrl = wmts;
  this.wmsLayers = [];
  this.wmtsLayers = [];
  this.isLoading = true;

  this.abstractService = '';
  this.accessConstraintsService = '';
  this.appWmtsHelper_.getCapabilities(wmts).then(function(capabilities) {
    if (capabilities === null) {
      return null;
    }
    this.appWmtsHelper_.getLayers(wmts).then(function(layers) {
      this.wmtsLayers = layers;
    }.bind(this));
    this.abstractService = '';
    this.accessConstraintsService = '';
    this.isLoading = false;
  }.bind(this));
};


/**
 * @return {string} The predefined wms url.
 * @export
 */
app.externaldata.ExternalDataController.prototype.getCurWms = function() {
  if (this.curDataUrl && this.curDataUrl.length > 0) {
    return this.curDataUrl;
  }
  return '';
};


/**
 * @return {string} The template.
 * @export
 */
app.externaldata.ExternalDataController.prototype.getWmsTreeTemplate = function() {
  return this.appWmsTreeTemplateUrl_;
};

/**
 * @return {string} The template.
 * @export
 */
app.externaldata.ExternalDataController.prototype.getWmtsTreeTemplate = function() {
  return this.appWmtsTreeTemplateUrl_;
};

/**
 * @param {Object} layer The selected layer.
 * @return {boolean} return true if added to the map.
 * @export
 */
app.externaldata.ExternalDataController.prototype.addWmsLayers = function(layer) {

  this.appWmsHelper_.addWmsLayers(this.map_, layer);
  return true;
};

/**
 * @param {Object} layer The selected layer.
 * @return {boolean} return true if added to the map.
 * @export
 */
app.externaldata.ExternalDataController.prototype.addWmtsLayers = function(layer) {

  this.appWmtsHelper_.addWmtsLayers(this.map_, layer, this.curDataUrl);
  return true;
};

/**
 * @param {Object} curLayer The selected layer.
 * @return {Array} return child layers.
 * @export
 */
app.externaldata.ExternalDataController.prototype.getChildLayers = function(curLayer) {
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
app.externaldata.ExternalDataController.prototype.hasProperty = function(
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
app.externaldata.ExternalDataController.prototype.trim = function(value) {
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
app.externaldata.ExternalDataController.prototype.isLayerActive = function(layerId) {
  if (layerId !== undefined) {
    var layer = goog.array.find(this.map_.getLayers().getArray(), function(layer, i) {
      if (layer.get('queryable_id') === layerId) {
        return true;
      }
      return false;
    }, this);
    if (layer) {
      return true;
    }
  }
  return false;
};


/**
 * @param {Object} rawLayer The layer to add or remove from the map.
 * @param {String | undefined} pLayerType The kind of layer to add or remove from the map.
 * @export
 */
app.externaldata.ExternalDataController.prototype.toggleLayer = function(rawLayer, pLayerType) {
  var layerType = (pLayerType === undefined) ? 'wms' : pLayerType;
  var layer = goog.array.find(this.map_.getLayers().getArray(), function(layer, i) {
    if (layer.get('queryable_id') === rawLayer['id']) {
      return true;
    }
    return false;
  }, this);
  if (layer) {
    this.map_.removeLayer(layer);
  } else {
    if (layerType === 'wms') {
      this.addWmsLayers(rawLayer);
    } else if (layerType === 'wmts') {
      this.addWmtsLayers(rawLayer);
    }
  }
};


/**
 * @param {Object} rawLayer The layer to add or remove from the map.
 * @param {string} type of the service to getIngo.
 * @export
 */
app.externaldata.ExternalDataController.prototype.getInfo = function(rawLayer, type) {
  if (type === undefined) {
    type = 'wms';
  }
  var layer = goog.array.find(this.map_.getLayers().getArray(), function(layer, i) {
    if (layer.get('queryable_id') === rawLayer['id']) {
      return true;
    }
    return false;
  }, this);
  if (layer) {
    this.showLayerInfo_(/** @type {ol.layer.Layer} */ (layer));
  } else {
    if (type === 'wms') {
      this.showLayerInfo_(this.appWmsHelper_.createWmsLayers(this.map_, rawLayer));
    } else if (type === 'wmts') {
      this.showLayerInfo_(this.appWmtsHelper_.createWmtsLayers(this.map_, rawLayer, rawLayer['options']));
    }
  }
};


app.module.controller('AppExternalDataController', app.externaldata.ExternalDataController);
