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
goog.module('app.LayerOpacityManager');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');
const olCollectionEventType = goog.require('ol.CollectionEventType');
const olEvents = goog.require('ol.events');


/**
 * @constructor
 * @ngInject
 */
exports = function() {
};


/**
 * @param {ol.Map} map The map.
 */
exports.prototype.init = function(map) {
  var layers = map.getLayers();
  olEvents.listen(layers, olCollectionEventType.ADD,
      /**
       * @param {ol.CollectionEventType} evt Collection event.
       */
      function(evt) {
        var layer = /** @type {ol.layer.Layer} */ (evt.element);
        var layerMetadata = layer.get('metadata');
        var layerStartOpacity = layerMetadata !== undefined &&
            layerMetadata.hasOwnProperty('start_opacity') ?
            +layerMetadata['start_opacity'] : 1;
        layer.setOpacity(layerStartOpacity);
      });
};


appModule.service('appLayerOpacityManager', exports);
