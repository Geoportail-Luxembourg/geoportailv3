/**
 * @module app.print.Printservice
 */
import ngeoPrintService from 'ngeo/print/Service.js';
import olArray from 'ol/array.js';
import olObj from 'ol/obj.js';
import olMath from 'ol/math.js';

const exports = class extends ngeoPrintService {
  /**
   * @param {string} url URL to MapFish print web service.
   * @param {angular.$http} $http Angular $http service.
   * @param {ngeo.map.LayerHelper} ngeoLayerHelper Ngeo Layer Helper service.
   */
  constructor(url, $http, ngeoLayerHelper) {
    super(url, $http, ngeoLayerHelper);
    /**
     * @type {ngeo.map.LayerHelper}
     * @private
     */
    this.ngeoLayerHelper2_ = ngeoLayerHelper;

  }
  /**
   * @override
   */
  createSpec(map, scale, dpi, layout, format, customAttributes) {

    const specMap = /** @type {MapFishPrintMap} */ ({
      dpi: dpi,
      rotation: /** number */ (customAttributes['rotation'])
    });

    this.encodeMap2_(map, scale, specMap);

    const attributes = /** @type {!MapFishPrintAttributes} */ ({
      map: specMap
    });
    olObj.assign(attributes, customAttributes);

    const spec = /** @type {MapFishPrintSpec} */ ({
      attributes,
      format,
      layout
    });

    return spec;
  }

  /**
   * @param {ol.Map} map Map.
   * @param {number} scale Scale.
   * @param {MapFishPrintMap} object Object.
   * @private
   */
  encodeMap2_(map, scale, object) {
    const view = map.getView();
    const viewCenter = view.getCenter();
    const viewProjection = view.getProjection();
    const viewResolution = view.getResolution();
    const viewRotation = object.rotation || olMath.toDegrees(view.getRotation());

    console.assert(viewCenter !== undefined);
    console.assert(viewProjection !== undefined);

    object.center = /** @type{Array<number>} */(viewCenter);
    object.projection = viewProjection.getCode();
    object.rotation = viewRotation;
    object.scale = scale;
    object.layers = [];

    const mapLayerGroup = map.getLayerGroup();
    console.assert(mapLayerGroup !== undefined && mapLayerGroup !== null);

    let layers = this.ngeoLayerHelper2_.getFlatLayers(mapLayerGroup);
    olArray.stableSort(layers, (layer_a, layer_b) => layer_a.getZIndex() - layer_b.getZIndex());
    layers = layers.slice().reverse();

    layers.forEach((layer) => {
      if (layer.getVisible()) {
        console.assert(viewResolution !== undefined);
        this.encodeLayer(object.layers, layer, /** @type{number} */(viewResolution));
      }
    });
  }
};


export default exports;
