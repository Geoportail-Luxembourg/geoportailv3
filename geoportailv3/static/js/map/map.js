/**
 * @fileoverview This file provides the "app.Map" class.
 * it extends "ol.Map" to support 3D in `getCoordinateFromPixel` method.
 */
goog.provide('app.Map');

goog.require('app');
goog.require('ol.Map');

app.Map = class extends ol.Map {

  /**
   * @override
   */
  getCoordinateFromPixel (pixel) {
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
    return [ cartesian.x, cartesian.y, cartesian.z ];
  };
}
