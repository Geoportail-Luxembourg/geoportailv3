/**
 * @module app.Map
 */
/**
 * @fileoverview This file provides the "app.Map" class.
 * it extends "ol.Map" to support 3D in `getCoordinateFromPixel` method.
 */

import olMap from 'ol/Map.js';

class ExtendedMapBoxLayerRenderer extends MapBoxLayerRenderer {

  constructor(...args) {
    super(...args);
  }

  /**
   * Create a layer renderer.
   * @param {import("../Map.js").default} _ The map renderer.
   * @param {import("../../layer/Layer.js").default} layer The layer to be rendererd.
   * @return {MapBoxLayerRenderer} The layer renderer.
   */
  static create(_, layer) {
    return new ExtendedMapBoxLayerRenderer(/** @type {MapBoxLayer} */ (layer));
  }

  /**
   * @param {import("../../coordinate.js").Coordinate} coordinate Coordinate.
   * @param {import("../../PluggableMap.js").FrameState} frameState Frame state.
   * @param {number} hitTolerance Hit tolerance in pixels.
   * @param {function(import("../../Feature.js").FeatureLike, import("../../layer/Layer.js").default): T} callback Feature callback.
   * @param {Array<import("../../Feature.js").FeatureLike>} declutteredFeatures Decluttered features.
   * @return {T|void} Callback result.
   * @template T
   */
  forEachFeatureAtCoordinate(
    coordinate,
    frameState,
    hitTolerance,
    callback,
    declutteredFeatures
  ) {}
};

const exports = class extends olMap {

  /**
   * Currently the zIndex is used to order the layers.
   * Rremoving a layer does not reset the zindex.
   * So adding a previously removed layer, will not add the layer on top
   * of the map but at the last Zindex position.
   * Thus we have to reset the zindex.
   * @override
   */
  addLayer(layer) {
    super.addLayer(layer);
    var i = 0;
    this.getLayers().forEach(function(layer) {
      // Layers having zIndex equal to 1000 are overlays.
      if (layer.getZIndex() < 1000) {
        layer.setZIndex(i);
        i++;
      }
    });
  }

  /**
   * @override
   */
  getCoordinateFromPixel(pixel) {
    if (Number.isNaN(pixel[0]) || Number.isNaN(pixel[1])) {
      // OpenLayers calls us on keyboard events...
      return null;
    }
    let coordinate = super.getCoordinateFromPixel(pixel);
    const manager = this.get('ol3dm');
    if (!manager || !manager.is3dEnabled()) {
      return coordinate;
    }
    const WMP = new Cesium.WebMercatorProjection(null);
    let cartesian = manager.getCesiumScene().pickPosition(
      new Cesium.Cartesian2(pixel[0], pixel[1])
    );
    if (!cartesian) {
      return null;
    }
    cartesian = WMP.project(Cesium.Cartographic.fromCartesian(cartesian));
    return [cartesian.x, cartesian.y, cartesian.z];
  }
};


export default exports;
