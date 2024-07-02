/**
 * @module ngeo.map.BackgroundLayerMgr
 */
import googAsserts from 'goog/asserts.js';
import ngeoCustomEvent from 'ngeo/CustomEvent.js';
import * as olBase from 'ol/index.js';
import olObservable from 'ol/Observable.js';
import olLayerGroup from 'ol/layer/Group.js';
import olLayerLayer from 'ol/layer/Layer.js';
import olSourceImageWMS from 'ol/source/ImageWMS.js';
import olSourceTileWMS from 'ol/source/TileWMS.js';
import olSourceWMTS from 'ol/source/WMTS.js';
import ngeoLayerHelper from 'ngeo/map/LayerHelper.js';

import { useMapStore, useOpenLayers, useBackgroundLayer } from "luxembourg-geoportail/bundle/lux.dist.js";


const BACKGROUNDLAYERGROUP_NAME = 'background';

export default class BackgroundLayerMgr extends olObservable {
  /**
   * Provides a service for setting/unsetting background layers
   * in maps.
   *
   * The notion of background/base layers doesn't exist in OpenLayers. This
   * service adds that notion.
   *
   * Setting a background layer to map is done with the `set` function:
   *
   *     ngeoBackgroundLayerMgr.set(map, layer);
   *
   * To unset the background layer pass `null` as the `layer` argument:
   *
   *     ngeoBackgroundLayerMgr.set(map, null);
   *
   * The `get` function returns the current background layer of the map passed
   * as an argument. `null` is returned if the map doesn't have a background
   * layer.
   *
   * The background layer is always added at index 0 in the map's layers
   * collection. When a background layer is set it is inserted (at index 0)
   * if the map does not already have a background layer, otherwise the
   * new background layer replaces the previous one at index 0.
   *
   * Users can subscribe to a 'change' event to get notified when the background
   * layer changes:
   *
   *     ngeoBackgroundLayerMgr.on('change', function(e) {
   *       // do something with the layer
   *       let layer = ngeoBackgroundLayerMgr.get();
   *       // know which layer was used before
   *       let previous = e.previous
   *     });
   *
   * See our live examples:
   * [../examples/backgroundlayer.html](../examples/backgroundlayer.html)
   * [../examples/backgroundlayerdropdown.html](../examples/backgroundlayerdropdown.html)
   *
   * @extends {ol.Observable}
   * @constructor
   * @struct
   * @param {ngeo.map.LayerHelper} ngeoLayerHelper Themes service.
   * @ngInject
   * @ngdoc service
   * @ngname ngeoBackgroundLayerMgr
   */
  constructor(ngeoLayerHelper) {
    super();

    /**
     * Object used to track if maps have background layers.
     * @type {Object.<string, boolean>}
     * @private
     */
    this.mapUids_ = {};

    /**
     * @type {ngeo.map.LayerHelper}
     * @private
     */
    this.ngeoLayerHelper_ = ngeoLayerHelper;

    this.mapStore_ = useMapStore();

  };


  /**
   * Return the current background layer of a given map. `null` is returned if
   * the map does not have a background layer.
   * @param {ol.Map} map Map.
   * @return {ol.layer.Base} layer The background layer.
   * @export
   */
  get(map) {
    return useOpenLayers().getLayerFromCache(this.mapStore_.bgLayer)

    // Deactivate legacy v3 for retrieving bgLayer
    const mapUid = olBase.getUid(map).toString();
    return mapUid in this.mapUids_ ? map.getLayers().item(0) : null;
  };


  /**
   * Set the background layer of a map. If `layer` is `null` the background layer
   * is removed.
   * @param {ol.Map} map The map.
   * @param {ol.layer.Base} layer The new background layer.
   * @return {ol.layer.Base} The previous background layer.
   * @export
   */
  set(map, layer) {
    useBackgroundLayer().setBgLayer(layer.get('id'))
    return

    // Deactivate legacy v3 for setting bgLayer
    const ZIndex = -200;
    map.getTargetElement().classList.toggle('blankBackground', layer.get('role') === 'blank' || layer.get('role') === 'mapboxBackground' || layer.get('role') === undefined);
    const mapUid = olBase.getUid(map).toString();
    const previous = this.get(map);
    if (layer !== null) {
      layer.setZIndex(ZIndex);
      this.ngeoLayerHelper_.setZIndexToFirstLevelChildren(layer, ZIndex);
    }

    if (previous !== null) {
      googAsserts.assert(mapUid in this.mapUids_);
      if (layer !== null) {
        layer.setVisible(true);
        map.getLayers().setAt(0, layer);
      } else {
        map.getLayers().removeAt(0);
        delete this.mapUids_[mapUid];
      }
    } else if (layer !== null) {
      map.getLayers().insertAt(0, layer);
      this.mapUids_[mapUid] = true;
    }
    /** @type {ngeox.BackgroundEvent} */
    const event = new ngeoCustomEvent('change', {
      current: layer,
      previous: previous
    });
    this.dispatchEvent(event);

    return previous;
  };

  /**
   * @param {ol.Map} map The map.
   * @param {Object.<string, string>} dimensions The global dimensions object.
   * @export
   */
  updateDimensions(map, dimensions) {
    const baseBgLayer = this.get(map);
    if (baseBgLayer) {
      let layers = [baseBgLayer];
      if (baseBgLayer instanceof olLayerGroup) {
        // Handle the first level of layers of the base background layer.
        layers = baseBgLayer.getLayers().getArray();
      }

      layers.forEach((layer) => {
        googAsserts.assertInstanceof(layer, olLayerLayer);
        if (layer) {
          let hasUpdates = false;
          const updatedDimensions = {};
          for (const key in layer.get('dimensions')) {
            const value = dimensions[key];
            if (value !== undefined) {
              updatedDimensions[key] = value;
              hasUpdates = true;
            }
          }
          if (hasUpdates) {
            const source = layer.getSource();
            if (source instanceof olSourceWMTS) {
              source.updateDimensions(updatedDimensions);
              source.refresh();
            } else if (source instanceof olSourceTileWMS || source instanceof olSourceImageWMS) {
              source.updateParams(updatedDimensions);
              source.refresh();
            }
          }
        }
      });
    }
  };
}

/**
 * @type {!angular.Module}
 */
module = angular.module('ngeoBackgroundLayerMgr', [
  ngeoLayerHelper.module.name
]);
module.service('ngeoBackgroundLayerMgr', ['ngeoLayerHelper', (ngeoLayerHelper) => {
  return new BackgroundLayerMgr(ngeoLayerHelper)
}]);
// module.service('ngeoBackgroundLayerMgr', BackgroundLayerMgr);

BackgroundLayerMgr.module = module;

/**
 * @const
 */
 BackgroundLayerMgr.BACKGROUNDLAYERGROUP_NAME = BACKGROUNDLAYERGROUP_NAME;
