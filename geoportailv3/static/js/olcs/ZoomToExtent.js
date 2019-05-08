/**
 * @module app.olcs.ZoomToExtent
 */
import olControlZoomToExtent from 'ol/control/ZoomToExtent.js';

const exports = class extends olControlZoomToExtent {
  /**
   * @param {ol.Extent} extent Extent
   * @param {app.olcs.Lux3DManager} ol3dm Manager getter
   */
  constructor(extent, ol3dm) {
    super({label: '\ue01b', extent});
    /**
     * @const {app.olcs.Lux3DManager}
     * @private
     */
    this.ol3dm = ol3dm;
  }

  /**
   * @override
   */
  handleZoomToExtent() {
    if (this.ol3dm && this.ol3dm.luxCameraExtentInRadians && this.ol3dm.is3dEnabled()) {
      const rectangle = new Cesium.Rectangle(...this.ol3dm.luxCameraExtentInRadians);
      const offset = 2000;
      this.ol3dm.flyToRectangle(rectangle, offset);
    } else {
      super.handleZoomToExtent();
    }
  }
};


export default exports;
