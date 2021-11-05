import {asArray as asColorArray} from 'ol/color';
import GeoJSON from 'ol/format/GeoJSON';
import GeometryType from 'ol/geom/GeometryType';
import ImageLayer from 'ol/layer/Image';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import {toDegrees} from 'ol/math';
import {toSize} from 'ol/size';
import ImageWMSSource from 'ol/source/ImageWMS';
import TileWMSSource from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import WMTSSource from 'ol/source/WMTS';
import CircleStyle from 'ol/style/Circle';
import RegularShapeStyle from 'ol/style/RegularShape';
import Style from 'ol/style/Style';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import {assign} from 'ol/obj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import IconStyle from 'ol/style/Icon';
import LayerGroup from 'ol/layer/Group';
import MapBoxLayer from '@geoblocks/mapboxlayer/src/MapBoxLayer.js';
import {getUid} from 'ol/util';
import {fromCircle} from 'ol/geom/Polygon';

/**
 * @enum {string}
 */
const PrintStyleType = {
  LINE_STRING: 'LineString',
  POINT: 'Point',
  POLYGON: 'Polygon'
};

/**
 * @type {Object.<GeometryType, PrintStyleType>}
 * @private
 */
const PrintStyleTypes = {};

PrintStyleTypes[GeometryType.LINE_STRING] = PrintStyleType.LINE_STRING;
PrintStyleTypes[GeometryType.POINT] = PrintStyleType.POINT;
PrintStyleTypes[GeometryType.POLYGON] = PrintStyleType.POLYGON;
PrintStyleTypes[GeometryType.MULTI_LINE_STRING] = PrintStyleType.LINE_STRING;
PrintStyleTypes[GeometryType.MULTI_POINT] = PrintStyleType.POINT;
PrintStyleTypes[GeometryType.MULTI_POLYGON] = PrintStyleType.POLYGON;

/**
 * @private
 */
const FEAT_STYLE_PROP_PREFIX = '_ngeo_style_';

/**
 * @const
 * @type {Array.<string>}
*/
export const PRINT_LAYOUTS = [
  'A4 landscape',
  'A4 portrait',
  'A3 landscape',
  'A3 portrait',
  'A2 landscape',
  'A2 portrait',
  'A1 landscape',
  'A1 portrait',
  'A0 landscape',
  'A0 portrait'
];

/**
 * @classdesc
 * @param {string} url URL to MapFish print web service.
 * @param {lux.Map} map Map object to print.
 * @constructor
 * @export
 */
export default class PrintManager {
  constructor(url, map) {
    /**
     * @type {lux.Map}
     * @private
     */
    this.map_ = map;

    /**
     * @type {string}
     * @private
     */
    this.url_ = url;

/**
 * @type {number}
 * @private
 */
this.dpi_ = 127;

/**
 * @type {number}
 * @private
 */
this.scale_ = 1500;
  }


/**
 * Cancel a report.
 * @param {string} ref Print report reference.
 * @return {Promise} HTTP promise.
 * @export
 */
cancel(ref) {
  return fetch(this.url_ + '/cancel/' + ref, {
    method: 'DELTE'
  });
}

/**
 * Create a report specification.
 * @param {number} scale Scale.
 * @param {number} dpi DPI.
 * @param {string} layout Layout.
 * @param {string} format Formats.
 * @param {Object.<string, *>} customAttributes Custom attributes.
 * @return {MapFishPrintSpec} The print spec.
 * @export
 */
createSpec(scale, dpi, layout, format, customAttributes) {
  this.dpi_ = dpi;
  this.scale_ = scale;
  var specMap = /** @type {MapFishPrintMap} */ ({
    dpi: dpi,
    rotation: /** number */ (customAttributes['rotation'])
  });

  this.encodeMap_(scale, specMap);

  var attributes = /** @type {!MapFishPrintAttributes} */ ({
    map: specMap
  });
  assign(attributes, customAttributes);

  var spec = /** @type {MapFishPrintSpec} */ ({
    attributes: attributes,
    format: format,
    layout: layout
  });

  return spec;
}

encodeXYZLayer_(arr, url) {
  // https://vectortiles.geoportail.lu/styles/roadmap_jsapi/{z}/{x}/{y}.png
  const i = url.indexOf('/{z}/{x}/{y}');
  const j = url.lastIndexOf('.');
  if (i === -1 || j === -1) {
    return;
  }
  const baseURL = url.substr(0, i);
  const imageExtension = url.substr(j + 1);
  const styleName = baseURL.substr(baseURL.lastIndexOf('/styles/') + '/styles/'.length);
  if (styleName === 'topomap' || styleName === 'roadmap' ||
    styleName === 'topomap_gray' || styleName === 'roadmap_jsapi') {
    const object = {
      'baseURL': 'https://wms.geoportail.lu/opendata/service',
      'imageFormat': 'image/' + imageExtension,
      'layers': [styleName === 'roadmap_jsapi' ? 'roadmap_luxonly' : styleName],
      'customParams': {
        'TRANSPARENT': true,
        'MAP_RESOLUTION': 127
      },
      'type': 'wms',
      'opacity': 1,
      'version': '1.1.1',
      'useNativeAngle': true
    };
    arr.push(object);
  } else {
    const object = {
      baseURL: baseURL,
      type: 'OSM',
      'imageExtension': imageExtension
    };
    arr.push(object);
  }
}

/**
 * @param {number} scale Scale.
 * @param {MapFishPrintMap} object Object.
 * @private
 */
encodeMap_(scale, object) {
  var view = this.map_.getView();
  var viewCenter = view.getCenter();
  var viewProjection = view.getProjection();
  var viewResolution = view.getResolution();
  var viewRotation = object.rotation || toDegrees(view.getRotation());

  console.assert(viewCenter !== undefined);
  console.assert(viewProjection !== undefined);

  object.center = viewCenter;
  object.projection = viewProjection.getCode();
  object.rotation = viewRotation;
  object.scale = scale;
  object.layers = [];

  var mapLayerGroup = this.map_.getLayerGroup();
  console.assert(mapLayerGroup !== null);
  var showLayer = this.map_.getShowLayer();
  var layers = this.getFlatLayers(mapLayerGroup);
  layers.push(showLayer);
  var drawingLayer = this.map_.getDrawingLayer();
  layers.push(drawingLayer);

  layers = layers.slice().reverse();

  layers.forEach(function (layer) {
    if (layer.getVisible()) {
      console.assert(viewResolution !== undefined);
      if (layer instanceof MapBoxLayer) {
        const xyz = layer.get('xyz_custom') || layer.getXYZ();
        if (xyz) {
          this.encodeXYZLayer_(object.layers, xyz);
          return;
        }
      }
      this.encodeLayer(object.layers, layer, viewResolution);
    }
  }, this);

  var overlays = this.map_.getOverlays();
  overlays.forEach(function (layer) {
    console.assert(viewResolution !== undefined);
    var element = layer.getElement();
    if (element !== undefined) {
      var image = element.firstChild;
      var url;
      if (image.getAttribute !== undefined) {
        url = image.getAttribute('src');
      }
      if (url !== undefined && url !== null && url.length > 0) {
        if (url.toLowerCase().indexOf('http') !== 0 &&
          url.toLowerCase().indexOf('//') === 0) {
          url = 'http:' + url;
        }
        var markerStyle = new Style({
          image: new IconStyle({
            anchor: [0.5, 1],
            src: url
          })
        });
        var position = layer.getPosition();
        if (position !== undefined && position !== null) {
          var geoMarker = new Feature({
            geometry: new Point(position)
          });
          var vectorLayer = new VectorLayer({
            source: new VectorSource({
              features: [geoMarker]
            }),
            style: markerStyle
          });
          var /** @type {Array.<MapFishPrintLayer>} */ overlaylayers = [];
          this.encodeLayer(overlaylayers, vectorLayer, viewResolution);
          object.layers.unshift(overlaylayers[0]);
        }
      }
    }
  }, this);
}

/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {ol.layer.Base} layer Layer.
 * @param {number} resolution Resolution.
 */
encodeLayer(arr, layer, resolution) {
  if (layer instanceof ImageLayer) {
    this.encodeImageLayer_(arr, layer);
  } else if (layer instanceof TileLayer) {
    this.encodeTileLayer_(arr, layer);
  } else if (layer instanceof VectorLayer) {
    this.encodeVectorLayer_(arr, layer, resolution);
  }
}

/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {ImageLayer} layer Layer.
 * @private
 */
encodeImageLayer_(arr, layer) {
  console.assert(layer instanceof ImageLayer);
  var source = layer.getSource();
  if (source instanceof ImageWMSSource) {
    this.encodeImageWmsLayer_(arr, layer);
  }
}

/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {ImageLayer} layer Layer.
 * @private
 */
encodeImageWmsLayer_(arr, layer) {
  var source = layer.getSource();

  console.assert(layer instanceof ImageLayer);
  console.assert(source instanceof ImageWMSSource);

  var url = source.getUrl();
  if (url !== undefined) {
    this.encodeWmsLayer_(arr, layer.getOpacity(), url, source.getParams());
  }
}

/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {number} opacity Opacity of the layer.
 * @param {string} url Url of the WMS server.
 * @param {Object} params Url parameters
 * @private
 */
encodeWmsLayer_(arr, opacity, url, params) {
  var customParams = {'TRANSPARENT': true, 'MAP_RESOLUTION': this.dpi_};
  assign(customParams, params);

  delete customParams['LAYERS'];
  delete customParams['FORMAT'];
  delete customParams['SERVERTYPE'];
  delete customParams['VERSION'];

  var object = /** @type {MapFishPrintWmsLayer} */ ({
    baseURL: this.getAbsoluteUrl_(url),
    imageFormat: 'FORMAT' in params ? params['FORMAT'] : 'image/png',
    layers: params['LAYERS'].split(','),
    customParams: customParams,
    serverType: params['SERVERTYPE'],
    type: 'wms',
    opacity: opacity,
    version: params['VERSION']
  });
  arr.push(object);
}

/**
 * @param {string} url URL.
 * @return {string} Absolute URL.
 * @private
 */
getAbsoluteUrl_(url) {
  var a = document.createElement('a');
  a.href = encodeURI(url);
  return decodeURI(a.href);
}

/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {TileLayer} layer Layer.
 * @private
 */
encodeTileLayer_(arr, layer) {
  console.assert(layer instanceof TileLayer);
  var source = layer.getSource();
  if (source instanceof WMTSSource) {
    this.encodeTileWmtsLayer_(arr, layer);
  } else if (source instanceof TileWMSSource) {
    this.encodeTileWmsLayer_(arr, layer);
  }
}

/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {TileLayer} layer Layer.
 * @private
 */
encodeTileWmtsLayer_(arr, layer) {
  console.assert(layer instanceof TileLayer);
  var source = layer.getSource();
  console.assert(source instanceof WMTSSource);
  var projection = source.getProjection();
  var tileGrid = source.getTileGrid();
  console.assert(tileGrid instanceof WMTSTileGrid);
  var matrixIds = tileGrid.getMatrixIds();
  /** @type {Array.<MapFishPrintWmtsMatrix>} */
  var matrices = [];
  for (var i = 0, ii = matrixIds.length; i < ii; ++i) {
    var tileRange = tileGrid.getFullTileRange(i);
    var matrixSize = [];
    if (tileRange !== null) {
      matrixSize = [
        tileRange.maxX - tileRange.minX,
        tileRange.maxY - tileRange.minY
      ];
    }
    matrices.push(/** @type {MapFishPrintWmtsMatrix} */({
      identifier: matrixIds[i],
      scaleDenominator: tileGrid.getResolution(i) *
        projection.getMetersPerUnit() / 0.28E-3,
      tileSize: toSize(tileGrid.getTileSize(i)),
      topLeftCorner: tileGrid.getOrigin(i),
      matrixSize: matrixSize
    }));
  }
  var dimensions = source.getDimensions();
  var dimensionKeys = Object.keys(dimensions);
  var object = /** @type {MapFishPrintWmtsLayer} */ ({
    baseURL: this.getWmtsUrl_(source),
    dimensions: dimensionKeys,
    dimensionParams: dimensions,
    imageFormat: source.getFormat(),
    layer: source.getLayer(),
    matrices: matrices,
    matrixSet: source.getMatrixSet(),
    opacity: layer.getOpacity(),
    requestEncoding: source.getRequestEncoding(),
    style: source.getStyle(),
    type: 'WMTS',
    version: source.getVersion()
  });
  if (object.matrixSet === 'GLOBAL_WEBMERCATOR_4_V3_HD') {
    // Ugly hack to request non retina wmts layer for print
    object.baseURL = object.baseURL.replace('_hd', '');
    object.matrixSet = object.matrixSet.replace('_HD', '');
  }
  if ((object.matrices instanceof Array)) {
    for (var j = object.matrices.length - 1; j > 0; j--) {
      if (object.matrices[j].scaleDenominator > this.scale_) {
        object.matrices.splice(0, j + 1);
        break;
      }
    }
  }
  arr.push(object);
}

/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {TileLayer} layer Layer.
 * @private
 */
encodeTileWmsLayer_(arr, layer) {
  var source = layer.getSource();

  console.assert(layer instanceof TileLayer);
  console.assert(source instanceof TileWMSSource);

  this.encodeWmsLayer_(arr, layer.getOpacity(), source.getUrls()[0], source.getParams());
}

/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {VectorLayer} layer Layer.
 * @param {number} resolution Resolution.
 * @private
 */
encodeVectorLayer_(arr, layer, resolution) {
  var source = layer.getSource();
  console.assert(source instanceof VectorSource);

  var features = source.getFeatures();

  var geojsonFormat = new GeoJSON();

  var /** @type {Array.<GeoJSONFeature>} */ geojsonFeatures = [];
  var mapfishStyleObject = /** @type {MapFishPrintVectorStyle} */ ({
    version: 2
  });

  for (var i = 0, ii = features.length; i < ii; ++i) {
    var originalFeature = features[i].clone();

    var styleData = null;
    var styleFunction = originalFeature.getStyleFunction();
    if (styleFunction !== undefined) {
      styleData = styleFunction.call(originalFeature, resolution);
    } else {
      styleFunction = layer.getStyleFunction();
      if (styleFunction !== undefined) {
        styleData = styleFunction.call(layer, originalFeature, resolution);
      }
    }
    if (originalFeature.getGeometry().getType() === 'Circle') {
      originalFeature.setGeometry(fromCircle(originalFeature.getGeometry(), 64));
    }
    var origGeojsonFeature = geojsonFormat.writeFeatureObject(originalFeature);
    origGeojsonFeature.properties = {};
    /**
     * @type {Array<Style>}
     */
    var styles = (styleData !== null && !Array.isArray(styleData)) ?
      [styleData] : styleData;
    console.assert(Array.isArray(styles));

    if (styles !== null && styles.length > 0) {
      var isOriginalFeatureAdded = false;
      for (var j = 0, jj = styles.length; j < jj; ++j) {
        var style = styles[j];
        var styleId = getUid(style).toString();
        var geometry = style.getGeometry();
        var geojsonFeature;
        if (!geometry) {
          geojsonFeature = origGeojsonFeature;
          geometry = originalFeature.getGeometry();
          // no need to encode features with no geometry
          if (!geometry) {
            continue;
          }
          if (!isOriginalFeatureAdded) {
            geojsonFeatures.push(geojsonFeature);
            isOriginalFeatureAdded = true;
          }
        } else {
          var styledFeature = originalFeature.clone();
          styledFeature.setGeometry(geometry);
          geojsonFeature = geojsonFormat.writeFeatureObject(styledFeature);
          geometry = styledFeature.getGeometry();
          styledFeature = null;
          geojsonFeatures.push(geojsonFeature);
        }

        var geometryType = geometry.getType();
        if (geojsonFeature.properties === null) {
          geojsonFeature.properties = {};
        }
        this.replaceNullValues(geojsonFeature.properties);

        var featureStyleProp = FEAT_STYLE_PROP_PREFIX + j;
        this.encodeVectorStyle_(
          mapfishStyleObject, geometryType, style, styleId, featureStyleProp);
        geojsonFeature.properties[featureStyleProp] = styleId;
      }
    }
  }

  // MapFish Print fails if there are no style rules, even if there are no
  // features either. To work around this we just ignore the layer if the
  // array of GeoJSON features is empty.
  // See https://github.com/mapfish/mapfish-print/issues/279

  if (geojsonFeatures.length > 0) {
    var geojsonFeatureCollection = /** @type {GeoJSONFeatureCollection} */ ({
      type: 'FeatureCollection',
      features: geojsonFeatures
    });
    var object = /** @type {MapFishPrintVectorLayer} */ ({
      geoJson: geojsonFeatureCollection,
      opacity: layer.getOpacity(),
      style: mapfishStyleObject,
      type: 'geojson'
    });
    arr.push(object);
  }
}

/**
 * @param {Object} object Object to replace the null values.
 * @private
 */
replaceNullValues(object) {
  // Mapfish print does not support null properties.
  for (var idx in object) {
    if (object[idx] === null) {
      object[idx] = '';
    }
    if (object[idx] instanceof Object) {
      this.replaceNullValues(object[idx]);
    }
  }
}

/**
 * @param {MapFishPrintVectorStyle} object MapFish style object.
 * @param {GeometryType} geometryType Type of the GeoJSON geometry
 * @param {Style} style Style.
 * @param {string} styleId Style id.
 * @param {string} featureStyleProp Feature style property name.
 * @private
 */
encodeVectorStyle_(object, geometryType, style, styleId, featureStyleProp) {
  if (!(geometryType in PrintStyleTypes)) {
    // unsupported geometry type
    return;
  }
  var styleType = PrintStyleTypes[geometryType];
  var key = '[' + featureStyleProp + ' = \'' + styleId + '\']';
  if (key in object) {
    // do nothing if we already have a style object for this CQL rule
    return;
  }

  var styleObject = /** @type {MapFishPrintSymbolizers} */ ({
    symbolizers: []
  });
  object[key] = styleObject;
  var fillStyle = style.getFill();
  var imageStyle = style.getImage();
  var strokeStyle = style.getStroke();
  var textStyle = style.getText();
  if (styleType == PrintStyleType.POLYGON) {
    if (fillStyle !== null) {
      this.encodeVectorStylePolygon_(
        styleObject.symbolizers, fillStyle, strokeStyle);
    }
  } else if (styleType == PrintStyleType.LINE_STRING) {
    if (strokeStyle !== null) {
      this.encodeVectorStyleLine_(styleObject.symbolizers, strokeStyle);
    }
  } else if (styleType == PrintStyleType.POINT) {
    if (imageStyle !== null) {
      this.encodeVectorStylePoint_(styleObject.symbolizers, imageStyle);
    }
  }
  if (textStyle !== null) {
    this.encodeTextStyle_(styleObject.symbolizers, textStyle);
  }

  // set the graphicFormat because mapfish print is not able
  // to guess it from the externalGraphic (doesn't end with file
  // extension)
  for (var j = 0; j < styleObject.symbolizers.length; j++) {
    var symbolizer = styleObject.symbolizers[j];
    symbolizer['conflictResolution'] = false;
    if (symbolizer.externalGraphic) {
      symbolizer.graphicFormat = 'image/png';
      if (symbolizer.externalGraphic.indexOf('scale=') > 0) {
        delete symbolizer.graphicHeight;
        delete symbolizer.graphicWidth;
      } else if (symbolizer.externalGraphic.indexOf('getarrow') > 0) {
        symbolizer.graphicHeight = 10;
        symbolizer.graphicWidth = 10;
      }
    }
  }
}


/**
 * @param {MapFishPrintSymbolizerPoint|MapFishPrintSymbolizerPolygon} symbolizer MapFish Print symbolizer.
 * @param {!FillStyle} fillStyle Fill style.
 * @private
 */
encodeVectorStyleFill_(symbolizer, fillStyle) {
  var fillColor = fillStyle.getColor();
  if (fillColor !== null) {
    console.assert(typeof fillColor === 'string' || Array.isArray(fillColor));
    fillColor = asColorArray(fillColor);
    console.assert(Array.isArray(fillColor), 'only supporting fill colors');
    symbolizer.fillColor = this.rgbArrayToHex(fillColor);
    symbolizer.fillOpacity = fillColor[3];
  }
}


/**
 * @param {Array.<MapFishPrintSymbolizer>} symbolizers Array of MapFish Print
 *     symbolizers.
 * @param {!StrokeStyle} strokeStyle Stroke style.
 * @private
 */
encodeVectorStyleLine_(symbolizers, strokeStyle) {
  var symbolizer = /** @type {MapFishPrintSymbolizerLine} */ ({
    type: 'line'
  });
  this.encodeVectorStyleStroke_(symbolizer, strokeStyle);
  symbolizers.push(symbolizer);
}

/**
 * @param {Array.<MapFishPrintSymbolizer>} symbolizers Array of MapFish Print symbolizers.
 * @param {!ol.style.Image} imageStyle Image style.
 * @private
 */
encodeVectorStylePoint_(symbolizers, imageStyle) {
  var symbolizer;
  if (imageStyle instanceof CircleStyle) {
    symbolizer = /** @type {MapFishPrintSymbolizerPoint} */ ({
      type: 'point'
    });
    symbolizer.pointRadius = imageStyle.getRadius();
    var fillStyle = imageStyle.getFill();
    if (fillStyle !== null) {
      this.encodeVectorStyleFill_(symbolizer, fillStyle);
    }
    var strokeStyle = imageStyle.getStroke();
    if (strokeStyle !== null) {
      this.encodeVectorStyleStroke_(symbolizer, strokeStyle);
    }
  } else if (imageStyle instanceof IconStyle) {
    var src = imageStyle.getSrc();
    if (src !== undefined) {
      symbolizer = /** @type {MapFishPrintSymbolizerPoint} */ ({
        type: 'point',
        externalGraphic: src
      });
      var opacity = imageStyle.getOpacity();
      if (opacity !== null) {
        symbolizer.graphicOpacity = opacity;
      }
      var size = imageStyle.getSize();
      if (size !== null) {
        var scale = imageStyle.getScale();
        if (isNaN(scale)) {
          scale = 1;
        }
        symbolizer.graphicWidth = size[0] * scale;
        symbolizer.graphicHeight = size[1] * scale;
      }
      var rotation = imageStyle.getRotation();
      if (isNaN(rotation)) {
        rotation = 0;
      }
      symbolizer.rotation = toDegrees(rotation);
    }
  } else if (imageStyle instanceof RegularShapeStyle) {
    /**
     * Mapfish Print does not support image defined with RegularShapeStyle.
     * As a workaround, I try to map the image on a well-known image name.
     */
    var points = /** @type{RegularShapeStyle} */ (imageStyle).getPoints();
    if (points !== null) {
      symbolizer = /** @type {MapFishPrintSymbolizerPoint} */ ({
        type: 'point'
      });
      if (points === 4) {
        symbolizer.graphicName = 'square';
      } else if (points === 3) {
        symbolizer.graphicName = 'triangle';
      } else if (points === 5) {
        symbolizer.graphicName = 'star';
      } else if (points === 8) {
        symbolizer.graphicName = 'cross';
      }
      var sizeShape = imageStyle.getSize();
      if (sizeShape !== null) {
        symbolizer.graphicWidth = sizeShape[0];
        symbolizer.graphicHeight = sizeShape[1];
      }
      var rotationShape = imageStyle.getRotation();
      if (!isNaN(rotationShape) && rotationShape !== 0) {
        symbolizer.rotation = toDegrees(rotationShape);
      }
      var opacityShape = imageStyle.getOpacity();
      if (opacityShape !== null) {
        symbolizer.graphicOpacity = opacityShape;
      }
      var strokeShape = imageStyle.getStroke();
      if (strokeShape !== null) {
        this.encodeVectorStyleStroke_(symbolizer, strokeShape);
      }
      var fillShape = imageStyle.getFill();
      if (fillShape !== null) {
        this.encodeVectorStyleFill_(symbolizer, fillShape);
      }
    }
  }
  if (symbolizer !== undefined) {
    symbolizers.push(symbolizer);
  }
}

/**
 * @param {Array.<MapFishPrintSymbolizer>} symbolizers Array of MapFish Print symbolizers.
 * @param {!FillStyle} fillStyle Fill style.
 * @param {StrokeStyle} strokeStyle Stroke style.
 * @private
 */
encodeVectorStylePolygon_(symbolizers, fillStyle, strokeStyle) {
  var symbolizer = /** @type {MapFishPrintSymbolizerPolygon} */ ({
    type: 'polygon'
  });
  this.encodeVectorStyleFill_(symbolizer, fillStyle);
  if (strokeStyle !== null) {
    this.encodeVectorStyleStroke_(symbolizer, strokeStyle);
  }
  symbolizers.push(symbolizer);
}

/**
 * @param {MapFishPrintSymbolizerPoint|MapFishPrintSymbolizerLine|MapFishPrintSymbolizerPolygon}
 *      symbolizer MapFish Print symbolizer.
 * @param {!StrokeStyle} strokeStyle Stroke style.
 * @private
 */
encodeVectorStyleStroke_(symbolizer, strokeStyle) {
  var strokeColor = strokeStyle.getColor();
  if (strokeColor !== null) {
    console.assert(Array.isArray(strokeColor));
    var strokeColorRgba = asColorArray(strokeColor);
    console.assert(Array.isArray(strokeColorRgba), 'only supporting stroke colors');
    symbolizer.strokeColor = this.rgbArrayToHex(strokeColorRgba);
    symbolizer.strokeOpacity = strokeColorRgba[3];
  }
  var strokeDashstyle = strokeStyle.getLineDash();
  if (strokeDashstyle !== null) {
    symbolizer.strokeDashstyle = strokeDashstyle.join(' ');
  }
  var strokeWidth = strokeStyle.getWidth();
  if (strokeWidth !== undefined) {
    symbolizer.strokeWidth = strokeWidth;
  }
}

/**
 * @param {Array.<MapFishPrintSymbolizerText>} symbolizers Array of MapFish Print symbolizers.
 * @param {!TextStyle} textStyle Text style.
 * @private
 */
encodeTextStyle_(symbolizers, textStyle) {
  var symbolizer = /** @type {MapFishPrintSymbolizerText} */ ({
    type: 'Text'
  });
  var label = textStyle.getText();
  if (label !== undefined) {
    symbolizer.label = label;

    var labelAlign = textStyle.getTextAlign();
    if (labelAlign !== undefined) {
      symbolizer.labelAlign = labelAlign;
    }

    var labelRotation = textStyle.getRotation();
    if (labelRotation !== undefined) {
      // Mapfish Print expects a string, not a number to rotate text
      symbolizer.labelRotation = (labelRotation * 180 / Math.PI).toString();
      // rotate around the vertical/horizontal center
      symbolizer.labelAlign = 'cm';
    }

    var fontStyle = textStyle.getFont();
    if (fontStyle !== undefined) {
      var font = fontStyle.split(' ');
      if (font.length >= 3) {
        symbolizer.fontWeight = font[0];
        symbolizer.fontSize = font[1];
        symbolizer.fontFamily = font.splice(2).join(' ');
      }
    }

    var strokeStyle = textStyle.getStroke();
    if (strokeStyle !== null) {
      var strokeColor = strokeStyle.getColor();
      console.assert(Array.isArray(strokeColor));
      var strokeColorRgba = asColorArray(strokeColor);
      console.assert(Array.isArray(strokeColorRgba), 'only supporting stroke colors');
      symbolizer.haloColor = this.rgbArrayToHex(strokeColorRgba);
      symbolizer.haloOpacity = strokeColorRgba[3];
      var width = strokeStyle.getWidth();
      if (width !== undefined) {
        symbolizer.haloRadius = width;
      }
    }

    var fillStyle = textStyle.getFill();
    if (fillStyle !== null) {
      var fillColor = fillStyle.getColor();
      console.assert(Array.isArray(fillColor), 'only supporting fill colors');
      var fillColorRgba = asColorArray(fillColor);
      console.assert(Array.isArray(fillColorRgba), 'only supporting fill colors');
      symbolizer.fontColor = this.rgbArrayToHex(fillColorRgba);
    }

    // Mapfish Print allows offset only if labelAlign is defined.
    if (symbolizer.labelAlign !== undefined) {
      symbolizer.labelXOffset = textStyle.getOffsetX();
      // Mapfish uses the opposite direction of OpenLayers for y axis, so the
      // minus sign is required for the y offset to be identical.
      symbolizer.labelYOffset = -textStyle.getOffsetY();
    }

    symbolizers.push(symbolizer);
  }
}

/**
 * Return the WMTS URL to use in the print spec.
 * @param {WMTSSource} source The WMTS source.
 * @return {string} URL.
 * @private
 */
getWmtsUrl_(source) {
  var urls = source.getUrls();
  console.assert(urls.length > 0);
  var url = urls[0];
  // Replace {Layer} in the URL
  // See <https://github.com/mapfish/mapfish-print/issues/236>
  var layer = source.getLayer();
  if (url.indexOf('{Layer}') >= 0) {
    url = url.replace('{Layer}', layer);
  }
  return this.getAbsoluteUrl_(url);
}

/**
 * Send a create report request to the MapFish Print service.
 * @param {MapFishPrintSpec} printSpec Print specification.
 * @return {Promise} HTTP promise.
 * @export
 */
createReport(printSpec) {
  var format = printSpec.format || 'pdf';
  var url = this.url_ + '/report.' + format;

  return fetch(url, /** @type {!RequestInit | undefined} */({
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: JSON.stringify(printSpec)
  }));
}

/**
 * Get the status of a report.
 * @param {string} ref Print report reference.
 * @return {Promise} HTTP promise.
 * @export
 */
getStatus(ref) {
  var url = this.url_ + '/status/' + ref + '.json';
  return fetch(url);
}


/**
 * Get the URL of a report.
 * @param {string} ref Print report reference.
 * @return {string} The report URL for this ref.
 * @export
 */
getReportUrl(ref) {
  return this.url_ + '/report/' + ref;
}

/**
 * Get an array of all layers in a group. The group can contain multiple levels
 * of others groups.
 * @param {ol.layer.Base} layer The base layer, mostly a group of layers.
 * @return {Array.<ol.layer.Layer>} Layers.
 * @export
 */
getFlatLayers(layer) {
  return this.getFlatLayers_(layer, []);
}


/**
 * Get an array of all layers in a group. The group can contain multiple levels
 * of others groups.
 * @param {ol.layer.Base} layer The base layer, mostly a group of layers.
 * @param {Array.<ol.layer.Base>} array An array to add layers.
 * @return {Array.<ol.layer.Layer>} Layers.
 * @private
 */
getFlatLayers_(layer, array) {
  if (layer instanceof LayerGroup) {
    var sublayers = layer.getLayers();
    sublayers.forEach((l) => {
      this.getFlatLayers_(l, array);
    });
  } else {
    if (array.indexOf(layer) < 0) {
      array.push(layer);
    }
  }
  return array;
}

/**
 * Converts a color from RGB to hex representation.
 * @param {!Array.<number>} rgb rgb representation of the color.
 * @return {string} hex representation of the color.
 */
rgbArrayToHex(rgb) {
  var r = rgb[0];
  var g = rgb[1];
  var b = rgb[2];
  if (r != (r & 255) || g != (g & 255) || b != (b & 255)) {
    throw Error('(' + r + ',' + g + ',' + b + ') ' + 'is not a valid RGB color');
  }
  var hexR = this.colorZeroPadding(r.toString(16));
  var hexG = this.colorZeroPadding(g.toString(16));
  var hexB = this.colorZeroPadding(b.toString(16));
  return '#' + hexR + hexG + hexB;
}

/**
 * Takes a hex value and prepends a zero if it's a single digit.
 * @param {string} hex Hex value to prepend if single digit.
 * @return {string} hex value prepended with zero if it was single digit,
 *     otherwise the same value that was passed in.
 */
colorZeroPadding(hex) {
  return hex.length == 1 ? '0' + hex : hex;
}
}
