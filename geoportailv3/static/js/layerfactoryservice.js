/**
 * @fileoverview This file defines Angular services to use to get OpenLayers
 * layers for the application.
 */
goog.provide('app.GetLayerForCatalogNode');
goog.provide('app.GetWmsLayer');
goog.provide('app.GetWmtsLayer');

goog.require('app');
goog.require('ngeo.DecorateLayer');
goog.require('ol.layer.Image');
goog.require('ol.layer.Tile');
goog.require('ol.source.ImageWMS');
goog.require('ol.source.WMTS');
goog.require('ol.tilegrid.WMTS');


/**
 * @typedef {function(string, string):ol.layer.Tile}
 */
app.GetWmtsLayer;


/**
 * @typedef {function(string, string, string, string=):ol.layer.Image}
 */
app.GetWmsLayer;


/**
 * @typedef {function(Object):ol.layer.Layer}
 */
app.GetLayerForCatalogNode;


/**
 * @const
 * @type {Object.<string, ol.layer.Layer>}
 * @private
 */
app.layerCache_ = {};


/**
 * @param {string} imageType Image type (e.g. "image/png").
 * @return {string} Image extensino (e.g. "png").
 * @private
 */
app.getImageExtension_ = function(imageType) {
  goog.asserts.assert(imageType.indexOf('/'));
  var imageExt = imageType.split('/')[1];
  goog.asserts.assert(imageExt == 'png' || imageExt == 'jpeg');
  return imageExt;
};


/**
 * @param {ngeo.DecorateLayer} ngeoDecorateLayer ngeo decorate layer service.
 * @return {app.GetWmtsLayer} The getWmtsLayer function.
 * @private
 * @ngInject
 */
app.getWmtsLayer_ = function(ngeoDecorateLayer) {
  return getWmtsLayer;

  /**
   * @param {string} name WMTS layer name.
   * @param {string} imageType Image type (e.g. "image/png").
   * @return {ol.layer.Tile} The layer.
   */
  function getWmtsLayer(name, imageType) {

    var imageExt = app.getImageExtension_(imageType);
    var url = 'http://wmts.geoportail.lu/mapproxy_4_v3/wmts/{Layer}/' +
        '{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.' + imageExt;

    var layer = new ol.layer.Tile({
      source: new ol.source.WMTS({
        url: url,
        layer: name,
        matrixSet: 'GLOBAL_WEBMERCATOR',
        format: imageType,
        requestEncoding: ol.source.WMTSRequestEncoding.REST,
        projection: ol.proj.get('EPSG:3857'),
        tileGrid: new ol.tilegrid.WMTS({
          origin: [-20037508.3428, 20037508.3428],
          resolutions: [156543.033928, 78271.516964,
            39135.758482, 19567.879241, 9783.9396205,
            4891.96981025, 2445.98490513, 1222.99245256,
            611.496226281, 305.748113141, 152.87405657,
            76.4370282852, 38.2185141426, 19.1092570713,
            9.55462853565, 4.77731426782, 2.38865713391,
            1.19432856696, 0.597164283478, 0.298582141739],
          matrixIds: [
            '00', '01', '02', '03', '04', '05', '06', '07', '08', '09',
            '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'
          ]
        }),
        style: 'default'
      })
    });

    layer.set('label', name);
    ngeoDecorateLayer(layer);

    return layer;
  }
};


app.module.factory('appGetWmtsLayer', app.getWmtsLayer_);


/**
 * @param {ngeo.DecorateLayer} ngeoDecorateLayer ngeo decorate layer service.
 * @return {app.GetWmsLayer} The getWmsLayer function.
 * @private
 * @ngInject
 */
app.getWmsLayer_ = function(ngeoDecorateLayer) {
  return getWmsLayer;

  /**
   * @param {string} name WMS layer name.
   * @param {string} layers Comma-separated list of layer names for that WMS
   *     layer.
   * @param {string} imageType Image type (e.g. "image/png").
   * @param {string=} opt_url WMS URL.
   * @return {ol.layer.Image} The layer.
   */
  function getWmsLayer(name, layers, imageType, opt_url) {
    var url = goog.isDef(opt_url) ?
        opt_url : 'http://devv3.geoportail.lu/main/wsgi/wms';
    var imageExt = app.getImageExtension_(imageType);
    var layer = new ol.layer.Image({
      source: new ol.source.ImageWMS({
        url: url,
        params: {
          'FORMAT': imageExt,
          'LAYERS': layers
        }
      })
    });

    layer.set('label', name);
    ngeoDecorateLayer(layer);

    return layer;
  }
};


app.module.factory('appGetWmsLayer', app.getWmsLayer_);


/**
 * Function returning a function used to get the layer object for a catalog
 * tree node.
 *
 * @param {app.GetWmtsLayer} appGetWmtsLayer The getWmtsLayer function.
 * @param {app.GetWmsLayer} appGetWmsLayer The getWmsLayer function.
 * @return {app.GetLayerForCatalogNode} The getLayerForCatalogNode function.
 * @private
 * @ngInject
 */
app.getLayerForCatalogNode_ = function(appGetWmtsLayer, appGetWmsLayer) {
  return getLayerForCatalogNode;

  /**
   * @param {Object} node Catalog tree node.
   * @return {ol.layer.Layer} OpenLayers layer.
   */
  function getLayerForCatalogNode(node) {
    var layer, layerCacheKey, type;
    if (!('type' in node)) {
      return null;
    }
    type = node['type'];
    layerCacheKey = type + '_' + node['name'];
    if (layerCacheKey in app.layerCache_) {
      return app.layerCache_[layerCacheKey];
    }
    if (type.indexOf('WMS') != -1) {
      goog.asserts.assert('name' in node);
      goog.asserts.assert('layers' in node);
      goog.asserts.assert('imageType' in node);
      layer = appGetWmsLayer(node['name'], node['layers'], node['imageType'],
          node['url']);
    } else if (type == 'WMTS') {
      goog.asserts.assert('name' in node);
      goog.asserts.assert('imageType' in node);
      layer = appGetWmtsLayer(node['name'], node['imageType']);
    } else {
      return null;
    }
    goog.asserts.assert(goog.isDefAndNotNull(layer));
    app.layerCache_[layerCacheKey] = layer;
    layer.set('metadata', node['metadata']);
    layer.set('queryable_id', node['id']);
    return layer;
  }
};



app.module.factory('appGetLayerForCatalogNode', app.getLayerForCatalogNode_);
