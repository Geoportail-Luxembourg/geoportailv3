/**
 * @fileoverview This file defines Angular services to use to get OpenLayers
 * layers for the application.
 */
goog.provide('app.GetLayerForCatalogNode');

goog.require('app.module');
goog.require('goog.asserts');
goog.require('goog.object');

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
