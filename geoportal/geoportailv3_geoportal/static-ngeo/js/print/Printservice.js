/**
 * @module app.print.Printservice
 */
import ngeoPrintService from 'ngeo/print/Service.js';
import {stableSort} from 'ol/array.js';
import {assign} from 'ol/obj.js';
import {toDegrees} from 'ol/math.js';
import * as olMath from 'ol/math.js';
import olStyleRegularShape from 'ol/style/RegularShape.js';
import VectorEncoder from 'ngeo/print/VectorEncoder.js';
import MapBoxLayer from '@geoblocks/mapboxlayer/src/MapBoxLayer.js';
import {MapLibreLayer} from "luxembourg-geoportail/bundle/lux.dist.js";

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
    if (imageStyle instanceof olStyleRegularShape) {
      /**
       * Mapfish Print does not support image defined with ol.style.RegularShape.
       * As a workaround, I try to map the image on a well-known image name.
       */
      const points = /** @type {ol.style.RegularShape} */ (imageStyle).getPoints();
      const angle = /** @type {ol.style.RegularShape} */ (imageStyle).getAngle();
      if (points !== null) {
        let symbolizer = /** @type {MapFishPrintSymbolizerPoint} */ ({
          type: 'point'
        });
        if (points === 4 && angle !== 0) {
          symbolizer.graphicName = 'square';
        } else if (points === 4 && angle === 0) {
          symbolizer.graphicName = 'cross';
        } else if (points === 3) {
          symbolizer.graphicName = 'triangle';
        } else if (points === 5) {
          symbolizer.graphicName = 'star';
        } else if (points === 8) {
          symbolizer.graphicName = 'cross';
        }
        const sizeShape = imageStyle.getSize();
        if (sizeShape !== null) {
          symbolizer.graphicWidth = sizeShape[0];
          symbolizer.graphicHeight = sizeShape[1];
        }
        const rotationShape = imageStyle.getRotation();
        if (!isNaN(rotationShape) && rotationShape !== 0) {
          symbolizer.rotation = olMath.toDegrees(rotationShape);
        }
        const opacityShape = imageStyle.getOpacity();
        if (opacityShape !== null) {
          symbolizer.graphicOpacity = opacityShape;
        }
        const strokeShape = imageStyle.getStroke();
        if (strokeShape !== null) {
          super.encodeVectorStyleStroke(symbolizer, strokeShape);
        }
        const fillShape = imageStyle.getFill();
        if (fillShape !== null) {
          super.encodeVectorStyleFill(symbolizer, fillShape);
        }
        if (symbolizer !== undefined) {
          if (symbolizer.graphicName === 'cross') {
            symbolizer.strokeWidth = 0;
            symbolizer.fillOpacity = 1;
          }
          symbolizers.push(symbolizer);
        }
      }
    } else {
      super.encodeVectorStylePoint(symbolizers, imageStyle);
    }
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
    const styleName = baseURL.substr(baseURL.lastIndexOf('/styles/') + '/styles/'.length);
    if (styleName === 'topomap' || styleName === 'roadmap' || styleName === 'topomap_gray') {
      const object = {
        'baseURL': 'https://wms.geoportail.lu/vectortiles_wms_4_print/service',
        'imageFormat': 'image/' + imageExtension,
        'layers': [styleName],
        'customParams': {
          'TRANSPARENT': true,
          'MAP_RESOLUTION': 127
        },
        'type': 'wms',
        'opacity': 1,
        'version': '1.1.1',
        'useNativeAngle': true
      }
      arr.push(object);
    } else {
      const object = {
        baseURL,
        type: "OSM",
        imageExtension
      };
      arr.push(object);
    }
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
    stableSort(layers, (layer_a, layer_b) => ((layer_a.getZIndex() !== undefined) ? layer_a.getZIndex() : 0) - ((layer_b.getZIndex() !== undefined) ? layer_b.getZIndex() : 0));
    layers = layers.slice().reverse();

    layers.forEach((layer) => {
      if (layer.getVisible()) {
        console.assert(viewResolution !== undefined);
        if (layer instanceof MapBoxLayer || layer instanceof MapLibreLayer) {
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
