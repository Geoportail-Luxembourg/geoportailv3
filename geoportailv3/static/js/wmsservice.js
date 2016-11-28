/**
 * @fileoverview Provides a wms helper iservice. That service is a function used
 * to retrieve and display the info (metadata) for a layer.
 */

goog.provide('app.WmsHelper');
goog.require('ngeo.DecorateLayer');
goog.require('ol.format.WMSCapabilities');

/**
 * @constructor
 * @param {angular.$sce} $sce Angular $sce service
 * @param {angular.$http} $http Angular http service.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {ngeo.DecorateLayer} ngeoDecorateLayer ngeo decorate layer service.
 * @ngInject
 */
app.WmsHelper = function($sce, $http, appNotify, gettextCatalog,
    ngeoDecorateLayer) {

  /**
   * @type {angular.$sce}
   * @private
   */
  this.$sce_ = $sce;

  /**
   * @type {ngeo.DecorateLayer}
   * @private
   */
  this.ngeoDecorateLayer_ = ngeoDecorateLayer;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * @type {angular.$http}
   * @private
   */
  this.http_ = $http;

  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

  /**
   * @type {Object.<string, !angular.$q.Promise>}
   * @private
   */
  this.wmsCapa_ = {};
};


/**
 * @param {string} wms The url of the wms.
 * @return {!angular.$q.Promise} Promise providing the capabilities.
 */
app.WmsHelper.prototype.getCapabilities = function(wms) {
  var basicWmsUrl = wms;
  var separator = '&';
  if (wms.indexOf('?') === -1) {
    separator = '?';
  }
  if (wms.indexOf('Capabilities') === -1) {
    wms = wms + separator + 'SERVICE=WMS&REQUEST=GetCapabilities';
  }

  if (!(wms in this.wmsCapa_)) {
    this.wmsCapa_[wms] = this.http_.get(wms)
    .then(function(data) {
      var capabilities = new ol.format.WMSCapabilities().read(data.data);
      var formats = capabilities['Capability']['Request']['GetMap']['Format'];
      var useTiles = false;
      if ('MaxWidth' in capabilities['Service'] &&
          'MaxHeight' in capabilities['Service'] &&
          capabilities['Service']['MaxWidth']  <= 4096 &&
          capabilities['Service']['MaxHeight'] <= 4096) {
        useTiles = true;
      }
      this.buildChildLayers_(basicWmsUrl, capabilities['Capability']['Layer'],
        capabilities['version'], formats, useTiles);

      return capabilities;
    }.bind(this));
  }
  return this.wmsCapa_[wms];
};


/**
 * @param {string} wms The wms url.
 * @param {Object} layer The layer object.
 * @param {string} wmsVersion The version of the wms.
 * @return {Object} Returns the layer object.
 * @param {string} imageFormats The available formats.
 * @param {boolean} useTiles Set if the layer has a max size.
 * @private
 */
app.WmsHelper.prototype.buildChildLayers_ = function(wms, layer, wmsVersion,
    imageFormats, useTiles) {

  if (!layer['Name']) {
    layer['isInvalid'] = true;
  }
  layer['uid'] = goog.getUid(layer).toString();
  if (!layer['isInvalid']) {
    layer['wmsUrl'] = wms;
    layer['wmsVersion'] = wmsVersion;
    layer['id'] = 'WMS||' + layer['wmsUrl'] + '||' + layer['Name'];
    layer['imageFormats'] = imageFormats;
    layer['useTiles'] = useTiles;
  }

  if (layer['Layer']) {
    for (var i = 0; i < layer['Layer'].length; i++) {
      var l = this.buildChildLayers_(wms, layer['Layer'][i], wmsVersion,
          imageFormats, useTiles);
      if (!l) {
        layer['Layer'].splice(i, 1);
        i--;
      }
    }

    // No valid child
    if (layer['Layer'].length == 0) {
      delete layer['Layer'];
    }
  }

  if (layer['isInvalid'] && !layer['Layer']) {
    return {};
  }

  return layer;
};


/**
 * @param {string} wms The url of the wms.
 * @return {!angular.$q.Promise} Promise providing the layers.
 * @export
 */
app.WmsHelper.prototype.getLayers = function(wms) {
  return this.getCapabilities(wms).then(function(capabilities) {
    return capabilities['Capability']['Layer']['Layer'];
  }.bind(this));
};


/**
 * @param {string} id The layer identifier.
 * @return {!angular.$q.Promise} Promise providing the layer.
 * @export
 */
app.WmsHelper.prototype.getLayerById = function(id) {
  var values = id.split('||');
  var serviceType = values[0];
  goog.asserts.assert(serviceType === 'WMS');
  var wms = values[1];
  return this.getLayers(wms).then(function(mainLayer) {
    return this.getChildLayerById_(mainLayer, id);
  }.bind(this));
};


/**
 * @param {string} id The layer identifier.
 * @return {!angular.$q.Promise} Promise providing the layer metadata.
 * @export
 */
app.WmsHelper.prototype.getMetadata = function(id) {
  return this.getLayerById(id).then(function(layer) {
    var hasLegend = false;
    var legendUrl = null;

    for (var i = 0;'Style' in layer && i < layer['Style'].length; i++) {
      if ('Name' in layer['Style'][i] &&
          layer['Style'][i]['Name'] === 'default' &&
          'LegendURL' in layer['Style'][i] &&
          layer['Style'][i]['LegendURL'].length > 0 &&
          'OnlineResource' in layer['Style'][i]['LegendURL'][0]) {
        hasLegend = true;
        legendUrl = layer['Style'][i]['LegendURL'][0]['OnlineResource'];
      }
    }
    var content = {
      'uid' : id,
      'legendUrl' : legendUrl,
      'hasLegend' : false,
      'hasImageLegend' : hasLegend,
      'isError' : false,
      'isShortDesc' : true
    };

    return this.getCapabilities(layer['wmsUrl']).then(function(capabilities) {
      var keywords = [];
      var curKeyword = null;
      if ('KeywordList' in capabilities['Service'] &&
          'Keyword' in capabilities['Service']['KeywordList']) {
        curKeyword = capabilities['Service']['KeywordList']['Keyword'];
        if (curKeyword instanceof Array) {
          keywords = curKeyword[0].split(',');
        } else {
          keywords = curKeyword.split(',');
        }
      } else if ('KeywordList' in capabilities['Service']) {
        curKeyword = capabilities['Service']['KeywordList'];
        if (curKeyword instanceof Array) {
          keywords = curKeyword[0].split(',');
        } else {
          keywords = curKeyword.split(',');
        }
      }
      var pocs = [];
      if ('ContactInformation' in capabilities['Service']) {
        pocs.push({
          'phone': capabilities['Service']['ContactInformation']['ContactVoiceTelephone'],
          'country': capabilities['Service']['ContactInformation']['ContactAddress']['Country'],
          'postalcode': capabilities['Service']['ContactInformation']['ContactAddress']['PostCode'],
          'email': capabilities['Service']['ContactInformation']['ContactElectronicMailAddress'],
          'fax': capabilities['Service']['ContactInformation']['ContactFacsimileTelephone'],
          'name': capabilities['Service']['ContactInformation']['ContactPersonPrimary']['ContactPerson'],
          'organisation': capabilities['Service']['ContactInformation']['ContactPersonPrimary']['ContactOrganization'],
          'city': capabilities['Service']['ContactInformation']['ContactAddress']['City'],
          'deliverypoint': capabilities['Service']['ContactInformation']['ContactAddress']['Address']
        });
      }
      var layerMetadata = {
        'pocs': pocs,
        'revisionDate': '',
        'keywords': keywords,
        'description': layer['Abstract'],
        'name': layer['Title'],
        'language': 'eng'
      };
      if ('description' in layerMetadata) {
        layerMetadata['trusted_description'] =
        this.$sce_.trustAsHtml(layerMetadata['description']);
        layerMetadata['short_trusted_description'] =
        this.$sce_.trustAsHtml(layerMetadata['description'].
        substring(0, 220));
      }
      content['layerMetadata'] = layerMetadata;
      return content;
    }.bind(this));
  }.bind(this));
};


/**
 * @param {Object} layer The layer object.
 * @param {string} id The layer id.
 * @return {Object} Returns the layer object.
 * @private
 */
app.WmsHelper.prototype.getChildLayerById_ = function(layer, id) {
  if (layer['id'] === id) {
    return layer;
  }
  for (var i = 0; i < layer.length; i++) {
    var curLayer = layer[i];
    if (curLayer['id'] === id) {
      return curLayer;
    }
    if (curLayer['Layer']) {
      var l = this.getChildLayerById_(curLayer['Layer'], id);
      if (l !== null) {
        return l;
      }
    }
  }
  return null;
};


/**
 * @param {ol.Map} map The map to add the layer.
 * @param {Object} layer The selected layer.
 * @return {boolean} return true if added to the map.
 * @export
 */
app.WmsHelper.prototype.addWmsLayers = function(map, layer) {
  map.addLayer(this.createWmsLayers(map, layer));
  return true;
};


/**
 * @param {ol.Map} map The map to add the layer.
 * @param {Object} layer The selected raw layer.
 * @return {ol.layer.Layer} return the created layer.
 */
app.WmsHelper.prototype.createWmsLayers = function(map, layer) {

  var imageFormats = layer['imageFormats'];

  var hasPng = false;
  var hasJpeg = false;
  var imageFormat = imageFormats[0];
  goog.array.forEach(imageFormats, function(format) {
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

  var imgOptions = {
    url: layer['wmsUrl'],
    params: {'LAYERS': layer['Name']},
    crossOrigin: 'anonymous'
  };

  var hasLuref = false;
  var has3857 = false;
  var projections = layer['CRS'] || layer.SRS || [];
  goog.array.forEach(projections, function(projection) {
    if (projection.toUpperCase() === 'EPSG:2169') {
      hasLuref = true;
    }
    if (projection.toUpperCase() === 'EPSG:3857') {
      has3857 = true;
    }
  }, this);

  if (hasLuref) {
    imgOptions.projection = 'EPSG:2169';
  } else if (has3857) {
    imgOptions.projection = 'EPSG:3857';
  } else {
    imgOptions.projection = projections[0];
  }

  imgOptions.params['FORMAT'] = imageFormat;

  var newLayer = null;
  if (layer['useTiles']) {
    newLayer = new ol.layer.Tile({
      source: new ol.source.TileWMS(imgOptions)
    });
  } else {
    newLayer = new ol.layer.Image({
      source: new ol.source.ImageWMS(imgOptions)
    });
  }
  newLayer.set('label', layer['Title']);
  newLayer.set('metadata',
    {'isExternalWms' : true,
     'metadata_id': layer['id'],
     'start_opacity': 1
    });
  newLayer.setOpacity(1);
  newLayer.set('queryable_id', layer['id']);
  this.ngeoDecorateLayer_(newLayer);
  return newLayer;
};

app.module.service('appWmsHelper', app.WmsHelper);
