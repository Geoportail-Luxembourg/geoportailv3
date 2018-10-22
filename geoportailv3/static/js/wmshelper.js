/**
 * @fileoverview Provides a wms helper iservice. That service is a function used
 * to retrieve and display the info (metadata) for a layer.
 */

goog.provide('app.WmsHelper');

goog.require('app.module');
goog.require('app.olcs.Extent');
goog.require('app.NotifyNotificationType');
goog.require('ngeo.misc.decorate');
goog.require('ol.format.WMSCapabilities');
goog.require('ol.layer.Image');
goog.require('ol.layer.Tile');
goog.require('ol.proj');
goog.require('ol.source.ImageWMS');
goog.require('ol.source.TileWMS');
goog.require('ol');


/**
 * @constructor
 * @param {angular.$sce} $sce Angular $sce service
 * @param {angular.$http} $http Angular http service.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {angular.$window} $window Window.
 * @param {string} httpsProxyUrl URL to https proxy.
 * @ngInject
 */
app.WmsHelper = function($sce, $http, appNotify, gettextCatalog,
    $window, httpsProxyUrl) {

  /**
   * @type {string}
   * @private
   */
  this.httpsProxyUrl_ = httpsProxyUrl;

  /**
   * @type {angular.$window}
   * @private
   */
  this.$window_ = $window;

  /**
   * @type {angular.$sce}
   * @private
   */
  this.$sce_ = $sce;

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
    wms = wms + separator + 'SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0';
  }

  if (!(wms in this.wmsCapa_)) {
    this.wmsCapa_[wms] = this.http_.get(this.proxyIfNeeded(wms))
    .then(function(data) {
      var capabilities = new ol.format.WMSCapabilities().read(data.data);
      if (!('Capability' in capabilities)) {
        return null;
      }
      var formats = capabilities['Capability']['Request']['GetMap']['Format'];
      var useTiles = false;
      if ('MaxWidth' in capabilities['Service'] &&
          'MaxHeight' in capabilities['Service'] &&
          capabilities['Service']['MaxWidth'] <= 4096 &&
          capabilities['Service']['MaxHeight'] <= 4096) {
        useTiles = true;
      }
      basicWmsUrl = this.getOnlineResource_(capabilities['Capability'], 'GetMap');
      if (basicWmsUrl.length === 0) {
        basicWmsUrl = wms;
      }
      this.buildChildLayers_(basicWmsUrl, capabilities['Capability']['Layer'],
        capabilities['version'], formats, useTiles, null);

      return capabilities;
    }.bind(this), function(e) {
      var msg = this.gettextCatalog.getString(
        'Impossible de contacter ce WMS');
      this.notify_(msg, app.NotifyNotificationType.ERROR);
      return null;
    }.bind(this));
  }
  return this.wmsCapa_[wms];
};


/**
 * @param {Object} capability The capability object.
 * @param {string} service The service we are looking for.
 * @return {string} Returns GetMap url if found.
 * @private
 */
app.WmsHelper.prototype.getOnlineResource_ = function(capability, service) {
  var onlineResource;
  if ('Request' in capability &&
      service in capability['Request'] &&
      'DCPType' in capability['Request']['GetMap']) {
    var dcpTypes = capability['Request']['GetMap']['DCPType'];
    var dcpType = dcpTypes.find(function(type) {
      if ('HTTP' in type) {
        return true;
      }
      return false;
    }, this);
    if (dcpType &&
        'Get' in dcpType['HTTP'] &&
        'OnlineResource' in dcpType['HTTP']['Get']) {
      onlineResource = dcpType['HTTP']['Get']['OnlineResource'];
    }
  }
  return onlineResource;
};

/**
 * @param {string} wms The wms url.
 * @param {Object} layer The layer object.
 * @param {string} wmsVersion The version of the wms.
 * @return {Object} Returns the layer object.
 * @param {string} imageFormats The available formats.
 * @param {boolean} useTiles Set if the layer has a max size.
 * @param {Object} parentLayer Parent layer object in capabilities tree.
 * @private
 */
app.WmsHelper.prototype.buildChildLayers_ = function(wms, layer, wmsVersion,
    imageFormats, useTiles, parentLayer) {

  if (!layer['Name']) {
    layer['isInvalid'] = true;
  }
  layer['uid'] = ol.getUid(layer).toString();
  if (!layer['isInvalid']) {
    layer['wmsUrl'] = wms;
    layer['wmsVersion'] = wmsVersion;

    layer['id'] = ('WMS||' + layer['wmsUrl'] + '||' + layer['Name']).
        split('-').join('%2D');
    layer['imageFormats'] = imageFormats;
    layer['useTiles'] = useTiles;
  }

  // casacading CRS
  layer['CRS'] = layer['CRS'] || [];
  if (parentLayer) {
    parentLayer['CRS'].forEach(function(crs) {
      layer['CRS'].indexOf(crs) < 0 && layer['CRS'].push(crs);
    });
  }

  if (layer['Layer']) {
    for (var i = 0; i < layer['Layer'].length; i++) {
      var l = this.buildChildLayers_(wms, layer['Layer'][i], wmsVersion,
          imageFormats, useTiles, layer);
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
    if ('Layer' in capabilities['Capability']['Layer']) {
      return capabilities['Capability']['Layer']['Layer'];
    }
    if ('Layer' in capabilities['Capability']) {
      return [capabilities['Capability']['Layer']];
    }
  }.bind(this));
};


/**
 * @param {string} id The layer identifier.
 * @return {!angular.$q.Promise} Promise providing the layer.
 * @export
 */
app.WmsHelper.prototype.getLayerById = function(id) {

  var values = id.split('%2D').join('-').split('||');
  var serviceType = values[0];
  console.assert(serviceType === 'WMS');
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

    for (var i = 0; 'Style' in layer && i < layer['Style'].length; i++) {
      if ('Name' in layer['Style'][i] &&
          layer['Style'][i]['Name'] === 'default' &&
          'LegendURL' in layer['Style'][i] &&
          layer['Style'][i]['LegendURL'].length > 0 &&
          'OnlineResource' in layer['Style'][i]['LegendURL'][0]) {
        hasLegend = true;
        legendUrl = this.proxyIfNeeded(layer['Style'][i]['LegendURL'][0]['OnlineResource']);
      }
    }
    var content = {
      'legendUrl': legendUrl,
      'hasLegend': false,
      'hasImageLegend': hasLegend,
      'isError': false,
      'isShortDesc': true
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
        var phone = capabilities['Service']['ContactInformation']['ContactVoiceTelephone'];
        var hasContactAddress = ('ContactAddress' in capabilities['Service']['ContactInformation']);
        var email = capabilities['Service']['ContactInformation']['ContactElectronicMailAddress'];
        var fax = capabilities['Service']['ContactInformation']['ContactFacsimileTelephone'];

        var country;
        var postalcode;
        var city;
        var deliverypoint;
        if (hasContactAddress) {
          country = capabilities['Service']['ContactInformation']['ContactAddress']['Country'];
          postalcode = capabilities['Service']['ContactInformation']['ContactAddress']['PostCode'];
          city = capabilities['Service']['ContactInformation']['ContactAddress']['City'];
          deliverypoint = capabilities['Service']['ContactInformation']['ContactAddress']['Address'];
        }
        var hasContactPersonPrimary = ('ContactPersonPrimary' in capabilities['Service']['ContactInformation']);
        var name;
        var organisation;
        if (hasContactPersonPrimary) {
          name = capabilities['Service']['ContactInformation']['ContactPersonPrimary']['ContactPerson'];
          organisation = capabilities['Service']['ContactInformation']['ContactPersonPrimary']['ContactOrganization'];
        }
        pocs.push({
          'phone': phone,
          'country': country,
          'postalcode': postalcode,
          'email': email,
          'fax': fax,
          'name': name,
          'organisation': organisation,
          'city': city,
          'deliverypoint': deliverypoint
        });
      }
      var accessConstraints = '';
      if ('AccessConstraints' in capabilities['Service']) {
        accessConstraints = capabilities['Service']['AccessConstraints'];
      }
      var onlineResource = this.getOnlineResource_(
        capabilities['Capability'], 'GetCapabilities');
      var serviceDescription = '';
      if ('Abstract' in capabilities['Service']) {
        serviceDescription = capabilities['Service']['Abstract'];
      }

      var layerMetadata = {
        'pocs': pocs,
        'revisionDate': '',
        'keywords': keywords,
        'description': layer['Abstract'],
        'name': layer['Title'],
        'accessConstraints': accessConstraints,
        'onlineResource': onlineResource,
        'serviceDescription': serviceDescription,
        'language': 'eng'
      };
      if ('description' in layerMetadata &&
          layerMetadata['description'] !== null &&
          layerMetadata['description'] !== undefined) {
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
  imageFormats.forEach(function(format) {
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
    url: this.proxyIfNeeded(layer['wmsUrl']),
    params: {
      'LAYERS': layer['Name']
    },
    crossOrigin: 'anonymous',
    ratio: 1
  };

  var hasLuref = false;
  var has3857 = false;
  var hasWGS84 = false;
  var projections = layer['CRS'] || layer['SRS'] || [];
  projections.forEach(function(projection) {
    if (projection.toUpperCase() === 'EPSG:2169') {
      hasLuref = true;
    }
    if (projection.toUpperCase() === 'EPSG:4326') {
      hasWGS84 = true;
    }
    if (projection.toUpperCase() === 'EPSG:3857') {
      has3857 = true;
    }
  }, this);

  if (hasLuref) {
    imgOptions.projection = 'EPSG:2169';
    imgOptions.params['VERSION'] = '1.1.1';
  } else if (has3857) {
    imgOptions.projection = 'EPSG:3857';
  } else if (hasWGS84) {
    imgOptions.projection = 'EPSG:4326';
  } else {
    imgOptions.projection = projections[0];
  }

  imgOptions.params['FORMAT'] = imageFormat;

  var newLayer = null;
  if (layer['useTiles']) {
    newLayer = new ol.layer.Tile({
      'olcs.extent': app.olcs.Extent,
      source: new ol.source.TileWMS(imgOptions)
    });
  } else {
    newLayer = new ol.layer.Image({
      'olcs.extent': app.olcs.Extent,
      source: new ol.source.ImageWMS(imgOptions)
    });
  }
  if (has3857) {
    newLayer.getSource().set('olcs.projection', ol.proj.get('EPSG:3857'));
  } else if (hasWGS84) {
    newLayer.getSource().set('olcs.projection', ol.proj.get('EPSG:4326'));
  }
  newLayer.set('label', layer['Title']);
  var curMatadata = {'isExternalWms': true,
    'metadata_id': layer['id'],
    'start_opacity': 1
  };
  newLayer.set('metadata', curMatadata);
  newLayer.setOpacity(1);
  newLayer.set('queryable_id', layer['id']);
  ngeo.misc.decorate.layer(newLayer);

  this.getMetadata(layer['id']).then(function(metadata) {
    if (metadata['hasImageLegend']) {
      curMatadata['legendUrl'] = metadata['legendUrl'];
      curMatadata['legendTitle'] = metadata['layerMetadata']['name'];
      curMatadata['legendAccessConstraints'] = metadata['layerMetadata']['accessConstraints'];
    }
  }.bind(this));
  return newLayer;
};

/**
 * @param {string} url The url to proxy.
 * @return {string} returns the proxyed url if needed.
 */
app.WmsHelper.prototype.proxyIfNeeded = function(url) {
  if (url.indexOf('httpsproxy') > 0) {
    return url;
  }

  if (this.$window_.location.protocol === 'https:' &&
      url.toLowerCase().indexOf('http:') === 0) {
    return this.httpsProxyUrl_ + '?url=' + encodeURIComponent(url);
  }
  return url;
};

app.module.service('appWmsHelper', app.WmsHelper);
