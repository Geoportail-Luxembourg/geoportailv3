/**
 * @fileoverview Provides a wmts helper iservice. That service is a function used
 * to retrieve and display the info (metadata) for a layer.
 */

goog.provide('app.WmtsHelper');

goog.require('ngeo.misc.decorate');
goog.require('goog.asserts');
goog.require('goog.array');
goog.require('goog.string');
goog.require('ol.format.WMTSCapabilities');
goog.require('ol.layer.Image');
goog.require('ol.layer.Tile');
goog.require('ol.source.ImageWMS');
goog.require('ol.source.TileWMS');
goog.require('ol.source.WMTS');
goog.require('ol.tilegrid.WMTS');
goog.require('app');

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
app.WmtsHelper = function($sce, $http, appNotify, gettextCatalog,
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
  this.wmtsCapa_ = {};
};


/**
 * @param {string} wmts The url of the wmts.
 * @return {!angular.$q.Promise} Promise providing the capabilities.
 */
app.WmtsHelper.prototype.getCapabilities = function(wmts) {

  var separator = '&';
  if (wmts.indexOf('?') === -1) {
    separator = '?';
  }
  if (wmts.indexOf('Capabilities') === -1) {
    wmts = wmts + separator + 'SERVICE=WTMS&REQUEST=GetCapabilities';
  }

  if (!(wmts in this.wmtsCapa_)) {
    this.wmtsCapa_[wmts] = this.http_.get(this.proxyIfNeeded(wmts))
    .then(function(data) {
      var capabilities = new ol.format.WMTSCapabilities().read(data.data);
      this.buildChildLayers_(wmts, capabilities);
      return capabilities;
    }.bind(this), function(e) {
      var msg = this.gettextCatalog.getString(
        'Impossible de contacter ce WMTS');
      this.notify_(msg, app.NotifyNotificationType.ERROR);
      return null;
    }.bind(this));
  }
  return this.wmtsCapa_[wmts];
};


/**
 * @param {Object} capability The capability object.
 * @param {string} service The service we are looking for.
 * @return {string} Returns GetMap url if found.
 * @private
 */
app.WmtsHelper.prototype.getOnlineResource_ = function(capability, service) {
  var onlineResource;
  if ('Request' in capability &&
      service in capability['Request'] &&
      'DCPType' in capability['Request']['GetMap']) {
    var dcpTypes = capability['Request']['GetMap']['DCPType'];
    var dcpType = goog.array.find(dcpTypes, function(type, i) {
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
 * @param {string} wmts The wmts url.
 * @param {Object} capabilities The capabilities.
 * @private
 */
app.WmtsHelper.prototype.buildChildLayers_ = function(wmts, capabilities) {
  var layers = capabilities['Contents']['Layer'];
  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    var wmtsConfig = {
      'layer': layer['Identifier'],
      'crossOrigin': 'anonymous'
    };
    var options = ol.source.WMTS.optionsFromCapabilities(capabilities, wmtsConfig);
    layer['options'] = options;
    layer['isInvalid'] = false;
    layer['uid'] = goog.getUid(layer).toString();
    if (!layer['isInvalid']) {
      layer['wmtsUrl'] = wmts;

      layer['id'] = ('WMTS||' + layer['wmtsUrl'] + '||' + layer['Identifier']).
          split('-').join('%2D');
    }
  }
};


/**
 * @param {string} wmts The url of the wmts.
 * @return {!angular.$q.Promise} Promise providing the layers.
 * @export
 */
app.WmtsHelper.prototype.getLayers = function(wmts) {
  return this.getCapabilities(wmts).then(function(capabilities) {
    if ('Layer' in capabilities['Contents']) {
      return capabilities['Contents']['Layer'];
    }
  }.bind(this));
};


/**
 * @param {string} id The layer identifier.
 * @return {!angular.$q.Promise} Promise providing the layer.
 * @export
 */
app.WmtsHelper.prototype.getLayerById = function(id) {

  var values = id.split('%2D').join('-').split('||');
  var serviceType = values[0];
  goog.asserts.assert(serviceType === 'WMTS');
  var wmts = values[1];
  return this.getLayers(wmts).then(function(mainLayer) {
    return this.getChildLayerById_(mainLayer, id);
  }.bind(this));
};


/**
 * @param {string} id The layer identifier.
 * @return {!angular.$q.Promise} Promise providing the layer metadata.
 * @export
 */
app.WmtsHelper.prototype.getMetadata = function(id) {
  return this.getLayerById(id).then(function(layer) {
    var hasLegend = false;
    var legendUrl = null;

    var content = {
      'legendUrl': legendUrl,
      'hasLegend': false,
      'hasImageLegend': hasLegend,
      'isError': false,
      'isShortDesc': true
    };

    return this.getCapabilities(layer['wmtsUrl']).then(function(capabilities) {
      var keywords = [];
      var curKeyword = null;
      if ('Keywords' in capabilities['ServiceIdentification'] &&
          'Keyword' in capabilities['ServiceIdentification']['Keywords']) {
        curKeyword = capabilities['ServiceIdentification']['Keywords']['Keyword'];
        if (curKeyword instanceof Array) {
          keywords = curKeyword[0].split(',');
        } else {
          keywords = curKeyword.split(',');
        }
      } else if ('Keywords' in capabilities['ServiceIdentification']) {
        curKeyword = capabilities['ServiceIdentification']['Keywords'];
        if (curKeyword instanceof Array) {
          keywords = curKeyword[0].split(',');
        } else {
          keywords = curKeyword.split(',');
        }
      }
      var pocs = [];
      if ('ServiceProvider' in capabilities && 'ServiceContact' in capabilities['ServiceProvider']) {
        var phone = capabilities['ServiceProvider']['ServiceContact']['ContactInfo']['Phone']['Voice'];
        var hasContactAddress = ('Address' in capabilities['ServiceProvider']['ServiceContact']['ContactInfo']);
        var fax = capabilities['ServiceProvider']['ServiceContact']['ContactInfo']['Phone']['Facsimile'];

        var country;
        var postalcode;
        var city;
        var deliverypoint;
        var email;
        if (hasContactAddress) {
          country = capabilities['ServiceProvider']['ServiceContact']['ContactInfo']['Address']['Country'];
          postalcode = capabilities['ServiceProvider']['ServiceContact']['ContactInfo']['Address']['PostCode'];
          city = capabilities['ServiceProvider']['ServiceContact']['ContactInfo']['Address']['City'];
          deliverypoint = capabilities['ServiceProvider']['ServiceContact']['ContactInfo']['Address']['DeliveryPoint'];
          email = capabilities['ServiceProvider']['ServiceContact']['ContactInfo']['Address']['ElectronicMailAddress'];
        }
        var hasContactPersonPrimary = ('ContactPersonPrimary' in capabilities['ServiceProvider']['ServiceContact']['ContactInfo']);
        var name;
        var organisation;
        if (hasContactPersonPrimary) {
          name = capabilities['ServiceProvider']['ServiceContact']['ContactInfo']['ContactPersonPrimary']['ContactPerson'];
          organisation = capabilities['ServiceProvider']['ServiceContact']['ContactInfo']['ContactPersonPrimary']['ContactOrganization'];
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
      if ('AccessConstraints' in capabilities['ServiceIdentification']) {
        accessConstraints = capabilities['ServiceIdentification']['AccessConstraints'];
      }
      var onlineResource = layer['wmtsUrl'];
      var serviceDescription = '';
      if ('Title' in capabilities['ServiceIdentification']) {
        serviceDescription = capabilities['ServiceIdentification']['Title'];
      }
      var layerDescription = '';
      if ('Abstract' in layer) {
        layerDescription = layer['Abstract'];
      }
      var layerTile = '';
      if ('Title' in layer) {
        layerTile = layer['Title'];
      }
      var layerMetadata = {
        'pocs': pocs,
        'revisionDate': '',
        'keywords': keywords,
        'description': layerDescription,
        'name': layerTile,
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
 * @param {Array<Object>} layers The layers array object.
 * @param {string} id The layer id.
 * @return {Object} Returns the layer object.
 * @private
 */
app.WmtsHelper.prototype.getChildLayerById_ = function(layers, id) {
  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    if (layer['id'] === id) {
      return layer;
    }
  }
  return null;
};


/**
 * @param {ol.Map} map The map to add the layer.
 * @param {Object} layer The selected layer.
 * @param {string} url The url of the capabilities.
 * @return {boolean} return true if added to the map.
 * @export
 */
app.WmtsHelper.prototype.addWmtsLayers = function(map, layer, url) {
  this.getCapabilities(url).then(function(capabilities) {
    map.addLayer(this.createWmtsLayers(map, layer, layer['options']));
  }.bind(this));
  return true;
};


/**
 * @param {ol.Map} map The map to add the layer.
 * @param {Object} layer The selected raw layer.
 * @param {olx.source.WMTSOptions} options The options.
 * @return {ol.layer.Layer} return the created layer.
 */
app.WmtsHelper.prototype.createWmtsLayers = function(map, layer, options) {
  var newLayer = new ol.layer.Tile({
    'olcs.extent': app.olcsExtent,
    source: new ol.source.WMTS(options)
  });

  newLayer.set('label', layer['Title']);
  var curMetadata = {
    'isExternalWmts': true,
    'metadata_id': layer['id'],
    'start_opacity': 1
  };
  newLayer.set('metadata', curMetadata);
  newLayer.setOpacity(1);
  newLayer.set('queryable_id', layer['id']);
  ngeo.misc.decorate.layer(newLayer);

  this.getMetadata(layer['id']).then(function(metadata) {
    if (metadata['hasImageLegend']) {
      curMetadata['legendUrl'] = metadata['legendUrl'];
      curMetadata['legendTitle'] = metadata['layerMetadata']['name'];
      curMetadata['legendAccessConstraints'] = metadata['layerMetadata']['accessConstraints'];
    }
  }.bind(this));
  return newLayer;
};

/**
 * @param {string} url The url to proxy.
 * @return {string} returns the proxyed url if needed.
 */
app.WmtsHelper.prototype.proxyIfNeeded = function(url) {
  if (url.indexOf('httpsproxy') > 0) {
    return url;
  }

  if (this.$window_.location.protocol === 'https:' &&
      goog.string.caseInsensitiveStartsWith(url, 'http:')) {
    return this.httpsProxyUrl_ + '?url=' + encodeURIComponent(url);
  }
  return url;
};

app.module.service('appWmtsHelper', app.WmtsHelper);
