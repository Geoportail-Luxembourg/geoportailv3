goog.provide('app.LayerFactory');

goog.require('app');
goog.require('ol.layer.Tile');
goog.require('ol.source.MapQuest');
goog.require('ol.source.OSM');
goog.require('ol.source.Stamen');


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
  if (!('layerType' in node)) {
    return null;
  }
  var type = node['layerType'];
  if (type in app.layerCache) {
    return app.layerCache[type];
  }
  var source;
  if (type == 'stamenWatercolor') {
    source = new ol.source.Stamen({
      layer: 'watercolor'
    });
  } else if (type == 'stamenTerrain-labels') {
    source = new ol.source.Stamen({
      layer: 'terrain-labels'
    });
  } else if (type == 'mapquestOsm') {
    source = new ol.source.MapQuest({
      layer: 'osm'
    });
  } else if (type == 'mapquestSat') {
    source = new ol.source.MapQuest({
      layer: 'sat'
    });
  } else if (type == 'mapquestHyb') {
    source = new ol.source.MapQuest({
      layer: 'hyb'
    });
  } else {
    source = new ol.source.OSM();
  }
  var layer = new ol.layer.Tile({
    source: source
  });
  app.layerCache[type] = layer;
  return layer;
};


app.module.value('ngeoLayercatalogLayerFactory', app.layerFactory);
