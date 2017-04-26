/**
 * @fileoverview This file defines Angular services to use to get OpenLayers
 * layers for the application.
 */
goog.provide('app.GetLayerForCatalogNode');
goog.provide('app.GetWmsLayer');
goog.provide('app.GetWmtsLayer');

goog.require('app');
goog.require('ngeo.DecorateLayer');
goog.require('goog.asserts');
goog.require('goog.object');
goog.require('ol.extent');
goog.require('ol.proj');
goog.require('ol.layer.Image');
goog.require('ol.layer.Tile');
goog.require('ol.source.ImageWMS');
goog.require('ol.source.WMTS');
goog.require('ol.tilegrid.WMTS');


/**
 * @typedef {function(string, string, boolean):ol.layer.Tile}
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
 * @param {string} requestScheme The scheme.
 * @return {app.GetWmtsLayer} The getWmtsLayer function.
 * @private
 * @ngInject
 */
app.getWmtsLayer_ = function(ngeoDecorateLayer, requestScheme) {
  return getWmtsLayer;

  /**
   * @param {string} name WMTS layer name.
   * @param {string} imageType Image type (e.g. "image/png").
   * @param {boolean} retina If there is a retina layer.
   * @return {ol.layer.Tile} The layer.
   */
  function getWmtsLayer(name, imageType, retina) {

    var imageExt = app.getImageExtension_(imageType);
    var retinaExtension = (retina ? '_hd' : '');
    var url = '//wmts{1-2}.geoportail.lu/mapproxy_4_v3/wmts/{Layer}' +
        retinaExtension +
        '/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.' + imageExt;

    if (requestScheme === 'https') {
      url = '//wmts{3-4}.geoportail.lu/mapproxy_4_v3/wmts/{Layer}' +
          retinaExtension +
          '/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.' + imageExt;
    }
    var projection = ol.proj.get('EPSG:3857');
    var extent = projection.getExtent();
    var layer = new ol.layer.Tile({
      source: new ol.source.WMTS({
        url: url,
        tilePixelRatio: (retina ? 2 : 1),
        layer: name,
        matrixSet: 'GLOBAL_WEBMERCATOR_4_V3' + (retina ? '_HD' : ''),
        format: imageType,
        requestEncoding: ol.source.WMTSRequestEncoding.REST,
        projection: projection,
        tileGrid: new ol.tilegrid.WMTS({
          origin: ol.extent.getTopLeft(extent),
          extent: extent,
          resolutions: [156543.033928, 78271.516964,
            39135.758482, 19567.879241, 9783.9396205,
            4891.96981025, 2445.98490513, 1222.99245256,
            611.496226281, 305.748113141, 152.87405657,
            76.4370282852, 38.2185141426, 19.1092570713,
            9.55462853565, 4.77731426782, 2.38865713391,
            1.19432856696, 0.597164283478, 0.298582141739,
            0.1492910708695, 0.07464553543475],
          matrixIds: [
            '00', '01', '02', '03', '04', '05', '06', '07', '08', '09',
            '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
            '21'
          ]
        }),
        style: 'default',
        crossOrigin: 'anonymous'
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
 * @param {string} proxyWmsUrl URL to the proxy wms.
 * @param {boolean} remoteProxyWms is the proxy wms remote or local.
 * @param {app.GetDevice} appGetDevice The device service.
 * @return {app.GetWmsLayer} The getWmsLayer function.
 * @private
 * @ngInject
 */
app.getWmsLayer_ = function(ngeoDecorateLayer, proxyWmsUrl, remoteProxyWms,
    appGetDevice) {
  return getWmsLayer;

  /**
   * @param {string} name WMS layer name.
   * @param {string} layers Comma-separated list of layer names for that WMS
   *     layer.
   * @param {string} imageType Image type (e.g. "image/png").
   * @param {string=} opt_url WMS URL.
   * @return {ol.layer.Image} The layer.
   */
  function getWmsLayer(name, layers, imageType, opt_url) {
    var url = goog.isDef(opt_url) ?
        opt_url : proxyWmsUrl;
    var optSource = {
      url: url,
      hidpi: appGetDevice.isHiDpi(),
      serverType: 'mapserver',
      params: {
        'FORMAT': app.getImageExtension_(imageType),
        'LAYERS': layers
      }
    };

    if (goog.isDef(opt_url) || remoteProxyWms) {
      optSource.crossOrigin = 'anonymous';
    }
    var layer = new ol.layer.Image({
      source: new ol.source.ImageWMS(optSource)
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
 * @param {app.GetDevice} appGetDevice The device service.
 * @private
 * @ngInject
 */
app.getLayerForCatalogNode_ = function(appGetWmtsLayer, appGetWmsLayer,
    appGetDevice) {
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
      var hasRetina = (node['metadata']['hasRetina'] === 'true' &&
        appGetDevice.isHiDpi());
      layer = appGetWmtsLayer(node['name'], node['imageType'], hasRetina);
    } else {
      return null;
    }
    goog.asserts.assert(goog.isDefAndNotNull(layer));
    app.layerCache_[layerCacheKey] = layer;
    layer.set('metadata', node['metadata']);
    layer.set('queryable_id', node['id']);
    if (goog.object.containsKey(node['metadata'], 'attribution')) {
      var source = layer.getSource();
      source.setAttributions(
        node['metadata']['attribution']
      );
    }
    return layer;
  }
};


app.module.factory('appGetLayerForCatalogNode', app.getLayerForCatalogNode_);
