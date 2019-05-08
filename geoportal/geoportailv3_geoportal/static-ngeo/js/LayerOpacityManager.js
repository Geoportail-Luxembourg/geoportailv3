/**
 * @module app.LayerOpacityManager
 */
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

import appModule from './module.js';
import olCollectionEventType from 'ol/CollectionEventType.js';
import {listen} from 'ol/events.js';

/**
 * @constructor
 * @ngInject
 */
const exports = function() {
};


/**
 * @param {ol.Map} map The map.
 */
exports.prototype.init = function(map) {
  var layers = map.getLayers();
  listen(layers, olCollectionEventType.ADD,
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


export default exports;
