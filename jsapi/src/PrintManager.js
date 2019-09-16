/**
 * @module lux.PrintManager
 */
import olBase from 'ol.js';
import olColor from 'ol/color.js';
import olFormatGeoJSON from 'ol/format/GeoJSON.js';
import olGeomGeometryType from 'ol/geom/GeometryType.js';
import olLayerImage from 'ol/layer/Image.js';
import olLayerTile from 'ol/layer/Tile.js';
import olLayerVector from 'ol/layer/Vector.js';
import olMath from 'ol/math.js';
import olSize from 'ol/size.js';
import olSourceImageWMS from 'ol/source/ImageWMS.js';
import olSourceTileWMS from 'ol/source/TileWMS.js';
import olSourceVector from 'ol/source/Vector.js';
import olSourceWMTS from 'ol/source/WMTS.js';
import olStyleCircle from 'ol/style/Circle.js';
import olStyleRegularShape from 'ol/style/RegularShape.js';
import olStyleStyle from 'ol/style/Style.js';
import olTilegridWMTS from 'ol/tilegrid/WMTS.js';
import olObj from 'ol/obj.js';
import olFeature from 'ol/Feature.js';
import olGeomPoint from 'ol/geom/Point.js';
import olStyleIcon from 'ol/style/Icon.js';
import olLayerGroup from 'ol/layer/Group.js';

/**
 * @classdesc
 * @param {string} url URL to MapFish print web service.
 * @param {lux.Map} map Map object to print.
 * @constructor
 * @export
 */
const exports = function(url, map) {
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
};

/**
 * @enum {string}
 */
lux.PrintStyleType = {
  LINE_STRING: 'LineString',
  POINT: 'Point',
  POLYGON: 'Polygon'
};


/**
 * @type {Object.<ol.geom.GeometryType, lux.PrintStyleType>}
 * @private
 */
lux.PrintStyleTypes_ = {};

lux.PrintStyleTypes_[olGeomGeometryType.LINE_STRING] =
    lux.PrintStyleType.LINE_STRING;
lux.PrintStyleTypes_[olGeomGeometryType.POINT] =
    lux.PrintStyleType.POINT;
lux.PrintStyleTypes_[olGeomGeometryType.POLYGON] =
    lux.PrintStyleType.POLYGON;
lux.PrintStyleTypes_[olGeomGeometryType.MULTI_LINE_STRING] =
    lux.PrintStyleType.LINE_STRING;
lux.PrintStyleTypes_[olGeomGeometryType.MULTI_POINT] =
    lux.PrintStyleType.POINT;
lux.PrintStyleTypes_[olGeomGeometryType.MULTI_POLYGON] =
    lux.PrintStyleType.POLYGON;

/**
 * @private
 */
exports.FEAT_STYLE_PROP_PREFIX_ = '_ngeo_style_';

/**
 * @const
 * @type {Array.<string>}
*/
exports.LAYOUTS = [
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
 * Cancel a report.
 * @param {string} ref Print report reference.
 * @return {Promise} HTTP promise.
 * @export
 */
exports.prototype.cancel = function(ref) {
  return fetch(this.url_ + '/cancel/' + ref, {
    method: 'DELTE'
  });
};

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
exports.prototype.createSpec = function(
    scale, dpi, layout, format, customAttributes) {
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
  olObj.assign(attributes, customAttributes);

  var spec = /** @type {MapFishPrintSpec} */ ({
    attributes: attributes,
    format: format,
    layout: layout
  });

  return spec;
};


/**
 * @param {number} scale Scale.
 * @param {MapFishPrintMap} object Object.
 * @private
 */
exports.prototype.encodeMap_ = function(scale, object) {
  var view = this.map_.getView();
  var viewCenter = view.getCenter();
  var viewProjection = view.getProjection();
  var viewResolution = view.getResolution();
  var viewRotation = object.rotation || olMath.toDegrees(view.getRotation());

  console.assert(viewCenter !== undefined);
  console.assert(viewProjection !== undefined);

  object.center = /** @type {Array<number>|null} */ (viewCenter);
  object.projection = viewProjection.getCode();
  object.rotation = viewRotation;
  object.scale = scale;
  object.layers = [];

  var mapLayerGroup = this.map_.getLayerGroup();
  console.assert(mapLayerGroup !== null);
  var showLayer = this.map_.getShowLayer();
  var layers = this.getFlatLayers(mapLayerGroup);
  layers.push(showLayer);
  layers = layers.slice().reverse();

  layers.forEach(function(layer) {
    if (layer.getVisible()) {
      console.assert(viewResolution !== undefined);
      this.encodeLayer(object.layers, layer, /** @type {number} */(viewResolution));
    }
  }, this);

  var overlays = this.map_.getOverlays();
  overlays.forEach(function(layer) {
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
        var markerStyle = new olStyleStyle({
          image: new olStyleIcon({
            anchor: [0.5, 1],
            src: url
          })
        });
        var position = layer.getPosition();
        if (position !== undefined && position !== null) {
          var geoMarker = new olFeature({
            geometry: new olGeomPoint(/** @type {Array<number>} */(position))
          });
          var vectorLayer = new olLayerVector({
            source: new olSourceVector({
              features: [geoMarker]
            }),
            style: markerStyle
          });
          var /** @type {Array.<MapFishPrintLayer>} */ overlaylayers = [];
          this.encodeLayer(overlaylayers, vectorLayer, /** @type {number} */(viewResolution));
          object.layers.unshift(overlaylayers[0]);
        }
      }
    }
  }, this);
};


/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {ol.layer.Base} layer Layer.
 * @param {number} resolution Resolution.
 */
exports.prototype.encodeLayer = function(arr, layer, resolution) {
  if (layer instanceof olLayerImage) {
    this.encodeImageLayer_(arr, layer);
  } else if (layer instanceof olLayerTile) {
    this.encodeTileLayer_(arr, layer);
  } else if (layer instanceof olLayerVector) {
    this.encodeVectorLayer_(arr, layer, resolution);
  }
};


/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {ol.layer.Image} layer Layer.
 * @private
 */
exports.prototype.encodeImageLayer_ = function(arr, layer) {
  console.assert(layer instanceof olLayerImage);
  var source = layer.getSource();
  if (source instanceof olSourceImageWMS) {
    this.encodeImageWmsLayer_(arr, layer);
  }
};


/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {ol.layer.Image} layer Layer.
 * @private
 */
exports.prototype.encodeImageWmsLayer_ = function(arr, layer) {
  var source = layer.getSource();

  console.assert(layer instanceof olLayerImage);
  console.assert(source instanceof olSourceImageWMS);

  var url = /** @type {ol.source.ImageWMS} */(source).getUrl();
  if (url !== undefined) {
    this.encodeWmsLayer_(
        arr, layer.getOpacity(), url, /** @type {ol.source.ImageWMS} */(source).getParams());
  }
};


/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {number} opacity Opacity of the layer.
 * @param {string} url Url of the WMS server.
 * @param {Object} params Url parameters
 * @private
 */
exports.prototype.encodeWmsLayer_ = function(arr, opacity, url, params) {
  var customParams = {'TRANSPARENT': true, 'MAP_RESOLUTION': this.dpi_};
  olObj.assign(customParams, params);

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
};


/**
 * @param {string} url URL.
 * @return {string} Absolute URL.
 * @private
 */
exports.prototype.getAbsoluteUrl_ = function(url) {
  var a = document.createElement('a');
  a.href = encodeURI(url);
  return decodeURI(a.href);
};


/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {ol.layer.Tile} layer Layer.
 * @private
 */
exports.prototype.encodeTileLayer_ = function(arr, layer) {
  console.assert(layer instanceof olLayerTile);
  var source = layer.getSource();
  if (source instanceof olSourceWMTS) {
    this.encodeTileWmtsLayer_(arr, layer);
  } else if (source instanceof olSourceTileWMS) {
    this.encodeTileWmsLayer_(arr, layer);
  }
};


/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {ol.layer.Tile} layer Layer.
 * @private
 */
exports.prototype.encodeTileWmtsLayer_ = function(arr, layer) {
  console.assert(layer instanceof olLayerTile);

  var source = /** @type{ol.source.WMTS} */(layer.getSource());
  console.assert(source instanceof olSourceWMTS);
  var projection = source.getProjection();
  var tileGrid = source.getTileGrid();
  console.assert(tileGrid instanceof olTilegridWMTS);
  var matrixIds = /** @type {ol.tilegrid.WMTS} */(tileGrid).getMatrixIds();
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
    matrices.push(/** @type {MapFishPrintWmtsMatrix} */ ({
      identifier: matrixIds[i],
      scaleDenominator: tileGrid.getResolution(i) *
          projection.getMetersPerUnit() / 0.28E-3,
      tileSize: olSize.toSize(tileGrid.getTileSize(i)),
      topLeftCorner: tileGrid.getOrigin(i),
      matrixSize: matrixSize
    }));
  }
  var dimensions = /** @type{ol.source.WMTS} */(source).getDimensions();
  var dimensionKeys = Object.keys(dimensions);
  var object = /** @type {MapFishPrintWmtsLayer} */ ({
    baseURL: this.getWmtsUrl_(/** @type{ol.source.WMTS} */(source)),
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
};


/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {ol.layer.Tile} layer Layer.
 * @private
 */
exports.prototype.encodeTileWmsLayer_ = function(arr, layer) {
  var source = /** @type{ol.source.TileWMS} */ (layer.getSource());

  console.assert(layer instanceof olLayerTile);
  console.assert(source instanceof olSourceTileWMS);

  this.encodeWmsLayer_(
      arr, layer.getOpacity(), source.getUrls()[0], source.getParams());
};


/**
 * @param {Array.<MapFishPrintLayer>} arr Array.
 * @param {ol.layer.Vector} layer Layer.
 * @param {number} resolution Resolution.
 * @private
 */
exports.prototype.encodeVectorLayer_ = function(arr, layer, resolution) {
  var source = layer.getSource();
  console.assert(source instanceof olSourceVector);

  var features = source.getFeatures();

  var geojsonFormat = new olFormatGeoJSON();

  var /** @type {Array.<GeoJSONFeature>} */ geojsonFeatures = [];
  var mapfishStyleObject = /** @type {MapFishPrintVectorStyle} */ ({
    version: 2
  });

  for (var i = 0, ii = features.length; i < ii; ++i) {
    var originalFeature = features[i];

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
    var origGeojsonFeature = geojsonFormat.writeFeatureObject(originalFeature);
    /**
     * @type {Array<ol.style.Style>}
     */
    var styles = (styleData !== null && !Array.isArray(styleData)) ?
        [styleData] : styleData;
    console.assert(Array.isArray(styles));

    if (styles !== null && styles.length > 0) {
      var isOriginalFeatureAdded = false;
      for (var j = 0, jj = styles.length; j < jj; ++j) {
        var style = styles[j];
        var styleId = olBase.getUid(style).toString();
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
          styledFeature.setGeometry(/** @type{ol.geom.Geometry} */(geometry));
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

        var featureStyleProp = exports.FEAT_STYLE_PROP_PREFIX_ + j;
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
};

/**
 * @param {Object} object Object to replace the null values.
 * @private
 */
exports.prototype.replaceNullValues = function(object) {
  // Mapfish print does not support null properties.
  for (var idx in object) {
    if (object[idx] === null) {
      object[idx] = '';
    }
    if (object[idx] instanceof Object) {
      this.replaceNullValues(object[idx]);
    }
  }
};

/**
 * @param {MapFishPrintVectorStyle} object MapFish style object.
 * @param {ol.geom.GeometryType} geometryType Type of the GeoJSON geometry
 * @param {ol.style.Style} style Style.
 * @param {string} styleId Style id.
 * @param {string} featureStyleProp Feature style property name.
 * @private
 */
exports.prototype.encodeVectorStyle_ = function(object, geometryType, style, styleId, featureStyleProp) {
  if (!(geometryType in lux.PrintStyleTypes_)) {
    // unsupported geometry type
    return;
  }
  var styleType = lux.PrintStyleTypes_[geometryType];
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
  if (styleType == lux.PrintStyleType.POLYGON) {
    if (fillStyle !== null) {
      this.encodeVectorStylePolygon_(
          styleObject.symbolizers, fillStyle, strokeStyle);
    }
  } else if (styleType == lux.PrintStyleType.LINE_STRING) {
    if (strokeStyle !== null) {
      this.encodeVectorStyleLine_(styleObject.symbolizers, strokeStyle);
    }
  } else if (styleType == lux.PrintStyleType.POINT) {
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
};


/**
 * @param {MapFishPrintSymbolizerPoint|MapFishPrintSymbolizerPolygon} symbolizer MapFish Print symbolizer.
 * @param {!ol.style.Fill} fillStyle Fill style.
 * @private
 */
exports.prototype.encodeVectorStyleFill_ = function(symbolizer, fillStyle) {
  var fillColor = fillStyle.getColor();
  if (fillColor !== null) {
    if (typeof (fillColor) === 'string' || Array.isArray(fillColor)) {
      fillColor = olColor.asArray(/** @type {Array<number>} */(fillColor));
    }
    console.assert(Array.isArray(fillColor), 'only supporting fill colors');
    symbolizer.fillColor = this.rgbArrayToHex(/** @type {!Array<number>} */(fillColor));
    symbolizer.fillOpacity = fillColor[3];
  }
};


/**
 * @param {Array.<MapFishPrintSymbolizer>} symbolizers Array of MapFish Print
 *     symbolizers.
 * @param {!ol.style.Stroke} strokeStyle Stroke style.
 * @private
 */
exports.prototype.encodeVectorStyleLine_ = function(symbolizers, strokeStyle) {
  var symbolizer = /** @type {MapFishPrintSymbolizerLine} */ ({
    type: 'line'
  });
  this.encodeVectorStyleStroke_(symbolizer, strokeStyle);
  symbolizers.push(symbolizer);
};


/**
 * @param {Array.<MapFishPrintSymbolizer>} symbolizers Array of MapFish Print
 *     symbolizers.
 * @param {!ol.style.Image} imageStyle Image style.
 * @private
 */
exports.prototype.encodeVectorStylePoint_ = function(symbolizers, imageStyle) {
  var symbolizer;
  if (imageStyle instanceof olStyleCircle) {
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
  } else if (imageStyle instanceof olStyleIcon) {
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
      symbolizer.rotation = olMath.toDegrees(rotation);
    }
  } else if (imageStyle instanceof olStyleRegularShape) {
    /**
     * Mapfish Print does not support image defined with ol.style.RegularShape.
     * As a workaround, I try to map the image on a well-known image name.
     */
    var points = /** @type{ol.style.RegularShape} */ (imageStyle).getPoints();
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
        symbolizer.rotation = olMath.toDegrees(rotationShape);
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
};


/**
 * @param {Array.<MapFishPrintSymbolizer>} symbolizers Array of MapFish Print
 *     symbolizers.
 * @param {!ol.style.Fill} fillStyle Fill style.
 * @param {ol.style.Stroke} strokeStyle Stroke style.
 * @private
 */
exports.prototype.encodeVectorStylePolygon_ = function(symbolizers, fillStyle, strokeStyle) {
  var symbolizer = /** @type {MapFishPrintSymbolizerPolygon} */ ({
    type: 'polygon'
  });
  this.encodeVectorStyleFill_(symbolizer, fillStyle);
  if (strokeStyle !== null) {
    this.encodeVectorStyleStroke_(symbolizer, strokeStyle);
  }
  symbolizers.push(symbolizer);
};


/**
 * @param {MapFishPrintSymbolizerPoint|MapFishPrintSymbolizerLine|MapFishPrintSymbolizerPolygon}
 *      symbolizer MapFish Print symbolizer.
 * @param {!ol.style.Stroke} strokeStyle Stroke style.
 * @private
 */
exports.prototype.encodeVectorStyleStroke_ = function(symbolizer, strokeStyle) {
  var strokeColor = strokeStyle.getColor();
  if (strokeColor !== null) {
    console.assert(Array.isArray(strokeColor));
    var strokeColorRgba = olColor.asArray(/** @type {Array<number>} */(strokeColor));
    console.assert(Array.isArray(strokeColorRgba), 'only supporting stroke colors');
    symbolizer.strokeColor = this.rgbArrayToHex(/** @type {!Array<number>} */(strokeColorRgba));
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
};


/**
 * @param {Array.<MapFishPrintSymbolizerText>} symbolizers Array of MapFish Print
 *     symbolizers.
 * @param {!ol.style.Text} textStyle Text style.
 * @private
 */
exports.prototype.encodeTextStyle_ = function(symbolizers, textStyle) {
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
      var strokeColorRgba = olColor.asArray(/** @type {!Array<number>} */(strokeColor));
      console.assert(Array.isArray(strokeColorRgba), 'only supporting stroke colors');
      symbolizer.haloColor = this.rgbArrayToHex(/** @type {!Array<number>} */(strokeColorRgba));
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
      var fillColorRgba = olColor.asArray(/** @type {!Array<number>} */(fillColor));
      console.assert(Array.isArray(fillColorRgba), 'only supporting fill colors');
      symbolizer.fontColor = this.rgbArrayToHex(/** @type {!Array<number>} */(fillColorRgba));
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
};


/**
 * Return the WMTS URL to use in the print spec.
 * @param {ol.source.WMTS} source The WMTS source.
 * @return {string} URL.
 * @private
 */
exports.prototype.getWmtsUrl_ = function(source) {
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
};


/**
 * Send a create report request to the MapFish Print service.
 * @param {MapFishPrintSpec} printSpec Print specification.
 * @return {Promise} HTTP promise.
 * @export
 */
exports.prototype.createReport = function(printSpec) {
  var format = printSpec.format || 'pdf';
  var url = this.url_ + '/report.' + format;

  return fetch(url, /** @type {!RequestInit | undefined} */ ({
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: JSON.stringify(printSpec)
  }));
};


/**
 * Get the status of a report.
 * @param {string} ref Print report reference.
 * @return {Promise} HTTP promise.
 * @export
 */
exports.prototype.getStatus = function(ref) {
  var url = this.url_ + '/status/' + ref + '.json';
  return fetch(url);
};


/**
 * Get the URL of a report.
 * @param {string} ref Print report reference.
 * @return {string} The report URL for this ref.
 * @export
 */
exports.prototype.getReportUrl = function(ref) {
  return this.url_ + '/report/' + ref;
};

/**
 * Get an array of all layers in a group. The group can contain multiple levels
 * of others groups.
 * @param {ol.layer.Base} layer The base layer, mostly a group of layers.
 * @return {Array.<ol.layer.Layer>} Layers.
 * @export
 */
exports.prototype.getFlatLayers = function(layer) {
  return this.getFlatLayers_(layer, []);
};


/**
 * Get an array of all layers in a group. The group can contain multiple levels
 * of others groups.
 * @param {ol.layer.Base} layer The base layer, mostly a group of layers.
 * @param {Array.<ol.layer.Base>} array An array to add layers.
 * @return {Array.<ol.layer.Layer>} Layers.
 * @private
 */
exports.prototype.getFlatLayers_ = function(layer, array) {
  if (layer instanceof olLayerGroup) {
    var sublayers = layer.getLayers();
    sublayers.forEach(function(l) {
      this.getFlatLayers_(l, array);
    }, this);
  } else {
    if (array.indexOf(layer) < 0) {
      array.push(layer);
    }
  }
  return array;
};

/**
 * Converts a color from RGB to hex representation.
 * @param {!Array.<number>} rgb rgb representation of the color.
 * @return {string} hex representation of the color.
 */
exports.prototype.rgbArrayToHex = function(rgb) {
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
};

/**
 * Takes a hex value and prepends a zero if it's a single digit.
 * Small helper method for use by goog.color and friends.
 * @param {string} hex Hex value to prepend if single digit.
 * @return {string} hex value prepended with zero if it was single digit,
 *     otherwise the same value that was passed in.
 */
exports.prototype.colorZeroPadding = function(hex) {
  return hex.length == 1 ? '0' + hex : hex;
};


export default exports;
