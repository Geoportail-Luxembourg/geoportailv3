/**
 * @fileoverview This file defines the "appLayerOpacityManager" service. This
 * service (re-)sets the opacity of layers added to the map. The opacity is
 * read from the layer's "start_opacity" metadata. If there's no metadata or
 * if the "start_opacity" property doesn't exist then the layer opacity is
 * reset to 1.
 *
 * Usage:
 *
 * appLayerOpacityManager.init(map);
 *
 */
goog.provide('app.LayerOpacityManager');

goog.require('app.module');
goog.require('ol.CollectionEventType');
goog.require('ol.events');


/**
 * @constructor
 * @ngInject
 */
app.LayerOpacityManager = function() {
};


/**
 * @param {ol.Map} map The map.
 */
app.LayerOpacityManager.prototype.init = function(map) {
  var layers = map.getLayers();
  ol.events.listen(layers, ol.CollectionEventType.ADD,
      /**
       * @param {ol.CollectionEventType} evt Collection event.
       */
      function(evt) {
        var layer = /** @type {ol.layer.Layer} */ (evt.element);
        var layerMetadata = layer.get('metadata');
        var layerStartOpacity = goog.isDef(layerMetadata) &&
            layerMetadata.hasOwnProperty('start_opacity') ?
            +layerMetadata['start_opacity'] : 1;
        layer.setOpacity(layerStartOpacity);
      });
};


app.module.service('appLayerOpacityManager', app.LayerOpacityManager);
