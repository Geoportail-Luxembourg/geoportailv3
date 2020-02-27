/**
 * @module app.print.Printservice
 */
import ngeoPrintService from 'ngeo/print/Service.js';
import {stableSort} from 'ol/array.js';
import {assign} from 'ol/obj.js';
import {toDegrees} from 'ol/math.js';

import VectorEncoder from 'ngeo/print/VectorEncoder.js';
import MapBoxLayer from '@geoblocks/mapboxlayer-legacy';

function rgbToHex(r, g, b) {
  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

class AppVectorEncoder extends VectorEncoder {
  /**
   * @param {string} appImagesPath Path the the static images.
   * @param {string} arrowUrl URL to the arrow.
   */
  constructor(appImagesPath, arrowUrl) {
    super();
    this.whiteArrowUrl_ = appImagesPath + 'arrow.png';
    this.arrowUrl_ = arrowUrl;
  }

  /**
   * @param {Array.<MapFishPrintSymbolizer>} symbolizers Array of MapFish Print symbolizers.
   * @param {!ol.style.Image} imageStyle Image style.
   * @protected
   * @override
   */
  encodeVectorStylePoint(symbolizers, imageStyle) {
    const len = symbolizers.length;
    super.encodeVectorStylePoint(symbolizers, imageStyle);
    const newLen = symbolizers.length;
    if (newLen > len) {
      const last = symbolizers[newLen - 1];
      if (last.externalGraphic === this.whiteArrowUrl_) {
        const rgba = imageStyle.getColor();
        const color = rgbToHex(rgba[0], rgba[1], rgba[2]);
        last.externalGraphic = `${this.arrowUrl_}?color=${color}`;
      }
    }
  }
}

const exports = class extends ngeoPrintService {
  /**
   * @param {string} url URL to MapFish print web service.
   * @param {angular.$http} $http Angular $http service.
   * @param {ngeo.map.LayerHelper} ngeoLayerHelper Ngeo Layer Helper service.
   * @param {string} appImagesPath Path the the static images.
   * @param {string} arrowUrl URL to the arrow.
   */
  constructor(url, $http, ngeoLayerHelper, appImagesPath, arrowUrl) {
    super(url, $http, ngeoLayerHelper);
    /**
     * @type {ngeo.map.LayerHelper}
     * @private
     */
    this.ngeoLayerHelper2_ = ngeoLayerHelper;

    // Replace encoder with our own
    this.vectorEncoder = new AppVectorEncoder(appImagesPath, arrowUrl);
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
    assign(attributes, customAttributes);

    const spec = /** @type {MapFishPrintSpec} */ ({
      attributes,
      format,
      layout
    });

    return spec;
  }


  encodeXYZLayer_(arr, url) {
    // https://vectortiles.geoportail.lu/styles/roadmap/{z}/{x}/{y}.png
    const i = url.indexOf('/{z}/{x}/{y}');
    const j = url.lastIndexOf('.');
    if (i === -1 || j === -1) {
      return;
    }
    const baseURL = url.substr(0, i);
    const imageExtension = url.substr(j + 1);
    const object = {
      baseURL,
      type: "OSM",
      imageExtension
    };
    arr.push(object);
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
    const viewRotation = object.rotation || toDegrees(view.getRotation());

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
    stableSort(layers, (layer_a, layer_b) => layer_a.getZIndex() - layer_b.getZIndex());
    layers = layers.slice().reverse();

    layers.forEach((layer) => {
      if (layer.getVisible()) {
        console.assert(viewResolution !== undefined);
        if (layer instanceof MapBoxLayer) {
          const xyz = layer.get('xyz_custom') || layer.getXYZ();
          if (xyz) {
            this.encodeXYZLayer_(object.layers, xyz);
            return;
          }
        }
        this.encodeLayer(object.layers, layer, /** @type{number} */(viewResolution));
      }
    });
  }
};


export default exports;
