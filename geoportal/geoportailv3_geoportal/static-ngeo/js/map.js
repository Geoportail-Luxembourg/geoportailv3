/**
 * @module app.Map
 */
/**
 * @fileoverview This file provides the "app.Map" class.
 * it extends "ol.Map" to support 3D in `getCoordinateFromPixel` method.
 */

import olMap from 'ol/Map.js';

const exports = class extends olMap {

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
