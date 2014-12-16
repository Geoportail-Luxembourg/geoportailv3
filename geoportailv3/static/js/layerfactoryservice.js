goog.provide('app.LayerFactory');

goog.require('app');
goog.require('ol.layer.Image');
goog.require('ol.layer.Tile');
goog.require('ol.source.ImageWMS');
goog.require('ol.source.WMTS');
goog.require('ol.tilegrid.WMTS');


/**
 * @typedef {function(Object):ol.layer.Layer}
 */
app.LayerFactory;


/**
 * @type {Object.<string, ol.layer.Layer>}
 */
app.layerCache = {};


/**
 * @param {Object} node Catalog tree node.
 * @return {ol.layer.Layer} OpenLayers layer.
 */
app.layerFactory = function(node) {
  if (!('type' in node)) {
    return null;
  }
  var type = node['type'];
  if ([type, node.name].join('_') in app.layerCache) {
    return app.layerCache[type];
  }

  var layer;

  if (type.indexOf('WMS') != -1) {
    layer = app.wmsLayerFactory(node);
  } else if (type == 'WMTS') {
    layer = app.wmtsLayerFactory(node);
  } else {
    return null;
  }
  app.layerCache[[type, node.name].join('_')] = layer;
  return layer;
};


/**
 * @param {Object} node Catalog tree node.
 * @return {ol.layer.Layer} OpenLayers layer.
 */
app.wmtsLayerFactory = function(node) {

  var projection = ol.proj.get('EPSG:3857');

  return new ol.layer.Tile({
    source: new ol.source.WMTS({
      url: 'http://wmts.geoportail.lu/mapproxy_4_v3/' +
          'wmts/{Layer}/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png',
      layer: node.name,
      // FIXME should be replaced by node.matrixSet
      // but there's a typo in the database for this attribute
      matrixSet: 'GLOBAL_WEBMERCATOR',
      requestEncoding: /** @type {ol.source.WMTSRequestEncoding} */ ('REST'),
      format: 'image/png',
      projection: projection,
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
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
          11, 12, 13, 14, 15, 16, 17, 18, 19
        ]
      }),
      style: 'default'
    })
  });
};


/**
 * @param {Object} node Catalog tree node.
 * @return {ol.layer.Layer} OpenLayers layer.
 */
app.wmsLayerFactory = function(node) {
  var type = node['type'];
  var layer;
  var source;
  if (type == 'internal WMS') {
    source = new ol.source.ImageWMS({
      // FIXME use the internalWmsUrl constant instead
      url: 'http://devv3.geoportail.lu/main/wsgi/wms',
      params: {
        'LAYERS': node.name
      }
    });
  } else if (type == 'external WMS') {
    source = new ol.source.ImageWMS({
      url: node.url,
      params: {
        'LAYERS': node.name
      }
    });
  }

  layer = new ol.layer.Image({
    source: /** @type {ol.source.Image} */ (source)
  });
  return layer;
};


app.module.value('ngeoLayertreeLayerFactory', app.layerFactory);
