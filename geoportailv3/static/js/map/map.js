/**
 * @fileoverview This file provides the "app.Map" class.
 * it extends "ol.Map" to support 3D in `getCoordinateFromPixel` method.
 */
goog.provide('app.Map');

goog.require('app');
goog.require('ol.Map');

app.Map = class extends ol.Map {

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
