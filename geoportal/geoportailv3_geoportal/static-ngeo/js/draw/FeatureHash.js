/**
 * @module app.draw.FeatureHash
 */
import ngeoFormatFeatureProperties from 'ngeo/format/FeatureProperties.js';
import ngeoUtils from 'ngeo/utils.js';

import olFeature from 'ol/Feature.js';
import {includes as arrayIncludes} from 'ol/array.js';
import {asArray as colorAsArray} from 'ol/color.js';
import olFormatTextFeature from 'ol/format/TextFeature.js';
import {transformWithOptions} from 'ol/format/Feature.js';
import olGeomGeometryLayout from 'ol/geom/GeometryLayout.js';
import olGeomGeometryType from 'ol/geom/GeometryType.js';
import olGeomLineString from 'ol/geom/LineString.js';
import olGeomMultiLineString from 'ol/geom/MultiLineString.js';
import olGeomMultiPoint from 'ol/geom/MultiPoint.js';
import olGeomMultiPolygon from 'ol/geom/MultiPolygon.js';
import olGeomPoint from 'ol/geom/Point.js';
import olGeomPolygon from 'ol/geom/Polygon.js';
import olStyleCircle from 'ol/style/Circle.js';
import olStyleFill from 'ol/style/Fill.js';
import olStyleStroke from 'ol/style/Stroke.js';
import olStyleStyle from 'ol/style/Style.js';
import olStyleText from 'ol/style/Text.js';


/**
 * @enum {string}
 */
const FeatureHashStyleType = {
  LINE_STRING: 'LineString',
  POINT: 'Point',
  POLYGON: 'Polygon'
};


/**
 * @type {Object.<ol.geom.GeometryType, FeatureHashStyleType>}
 * @private
 */
const FeatureHashStyleTypes = {};

FeatureHashStyleTypes[olGeomGeometryType.LINE_STRING] =
    FeatureHashStyleType.LINE_STRING;
FeatureHashStyleTypes[olGeomGeometryType.POINT] =
    FeatureHashStyleType.POINT;
FeatureHashStyleTypes[olGeomGeometryType.POLYGON] =
    FeatureHashStyleType.POLYGON;
FeatureHashStyleTypes[olGeomGeometryType.MULTI_LINE_STRING] =
    FeatureHashStyleType.LINE_STRING;
FeatureHashStyleTypes[olGeomGeometryType.MULTI_POINT] =
    FeatureHashStyleType.POINT;
FeatureHashStyleTypes[olGeomGeometryType.MULTI_POLYGON] =
    FeatureHashStyleType.POLYGON;


/**
 * @type {Object.<string, string>}
 * @private
 */
let FeatureHashLegacyProperties = {};


class FeatureHash extends olFormatTextFeature {
  /**
   * @classdesc
   * Provide an OpenLayers format for encoding and decoding features for use
   * in permalinks.
   *
   * The code is based on Stéphane Brunner's URLCompressed format.
   *
   * TODOs:
   *
   * - The OpenLayers-URLCompressed format has options where the user
   *   can define attribute and style transformers. This is currently
   *   not supported by this format.
   * - The OpenLayers-URLCompressed format has a "simplify" option.
   *   This format does not have it.
   * - ol.style.Icon styles are not supported.
   * - Transformation of coordinates during encoding and decoding is
   *   not supported.
   *
   * @see https://github.com/sbrunner/OpenLayers-URLCompressed
   * @constructor
   * @struct
   * @extends {ol.format.TextFeature}
   * @param {ngeox.format.FeatureHashOptions=} opt_options Options.
   * @export
   */
  constructor(opt_options) {
    super();

    var options = opt_options !== undefined ? opt_options : {};

    /**
     * @type {number}
     * @private
     */
    this.accuracy_ = options.accuracy !== undefined ?
        options.accuracy : ACCURACY_;

    /**
     * @type {boolean}
     * @private
     */
    this.encodeStyles_ = options.encodeStyles !== undefined ?
        options.encodeStyles : true;

    /**
     * @type {function(ol.Feature):Object.<string, (string|number)>}
     * @private
     */
    this.propertiesFunction_ = options.properties !== undefined ?
        options.properties : defaultPropertiesFunction_;

    /**
     * @type {boolean}
     * @private
     */
    this.setStyle_ = options.setStyle !== undefined ? options.setStyle : true;

    /**
     * @type {number}
     * @private
     */
    this.prevX_ = 0;

    /**
     * @type {number}
     * @private
     */
    this.prevY_ = 0;

    FeatureHashLegacyProperties = (options.propertiesType !== undefined) &&  options.propertiesType;

  };


  /**
   * @inheritDoc
   * @export
   */
  //readFeature;


  /**
   * @inheritDoc
   * @export
   */
  //readFeatures;


  /**
   * @inheritDoc
   * @export
   */
  //readGeometry;


  /**
   * @inheritDoc
   * @export
   */
  //writeFeature;


  /**
   * @inheritDoc
   * @export
   */
  //writeFeatures;


  /**
   * @inheritDoc
   * @export
   */
  //writeGeometry;



  /**
   * Read a logical sequence of characters and return (or complet then return)
   * an array of numbers. The coordinates are assumed to be in
   * two dimensions and in latitude, longitude order.
   * corresponding to a geometry's coordinates.
   * @param {string} text Text.
   * @param {Array.<number>=} opt_flatCoordinates Flat coordinates array.
   * @return {Array.<number>} Flat coordinates.
   * @private
   */
  decodeCoordinates_(text, opt_flatCoordinates) {
    var len = text.length;
    var index = 0;
    var flatCoordinates = opt_flatCoordinates !== undefined ?
        opt_flatCoordinates : [];
    var i = flatCoordinates.length;
    while (index < len) {
      var b;
      var shift = 0;
      var result = 0;
      do {
        b = CHAR64_.indexOf(text.charAt(index++));
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 32);
      var dx = ((result & 1) ? ~(result >> 1) : (result >> 1));
      this.prevX_ += dx;
      shift = 0;
      result = 0;
      do {
        b = CHAR64_.indexOf(text.charAt(index++));
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 32);
      var dy = ((result & 1) ? ~(result >> 1) : (result >> 1));
      this.prevY_ += dy;
      flatCoordinates[i++] = this.prevX_ * this.accuracy_;
      flatCoordinates[i++] = this.prevY_ * this.accuracy_;
    }
    return flatCoordinates;
  };


  /**
   * Encode an array of number (corresponding to some coordinates) into a
   * logical sequence of characters. The coordinates are assumed to be in
   * two dimensions and in latitude, longitude order.
   * @param {Array.<number>} flatCoordinates Flat coordinates.
   * @param {number} stride Stride.
   * @param {number} offset Offset.
   * @param {number} end End.
   * @return {string} String.
   * @private
   */
  encodeCoordinates_(flatCoordinates, stride, offset, end) {
    var encodedCoordinates = '';
    for (var i = offset; i < end; i += stride) {
      var x = flatCoordinates[i];
      var y = flatCoordinates[i + 1];
      x = Math.floor(x / this.accuracy_);
      y = Math.floor(y / this.accuracy_);
      var dx = x - this.prevX_;
      var dy = y - this.prevY_;
      this.prevX_ = x;
      this.prevY_ = y;
      encodedCoordinates += encodeSignedNumber_(dx) +
          encodeSignedNumber_(dy);
    }
    return encodedCoordinates;
  };


  /**
   * Read a feature from a logical sequence of characters.
   * @param {string} text Text.
   * @param {olx.format.ReadOptions=} opt_options Read options.
   * @return {ol.Feature} Feature.
   * @override
   * @protected
   */
  readFeatureFromText(text, opt_options) {
    console.assert(text.length > 2);
    console.assert(text[1] === '(');
    console.assert(text[text.length - 1] === ')');
    var splitIndex = text.indexOf('~');
    var geometryText = splitIndex >= 0 ?
        text.substring(0, splitIndex) + ')' : text;
    var geometry = this.readGeometryFromText(geometryText, opt_options);
    var feature = new olFeature(geometry);
    if (splitIndex >= 0) {
      var attributesAndStylesText = text.substring(
          splitIndex + 1, text.length - 1);
      splitIndex = attributesAndStylesText.indexOf('~');
      var attributesText = splitIndex >= 0 ?
          attributesAndStylesText.substring(0, splitIndex) :
          attributesAndStylesText;
      if (attributesText != '') {
        var parts = attributesText.split('\'');
        for (var i = 0; i < parts.length; ++i) {
          var part = decodeURIComponent(parts[i]);
          var keyVal = part.split('*');
          console.assert(keyVal.length === 2);
          var key = keyVal[0];
          var value = keyVal[1];
          if (!this.setStyle_ && FeatureHashLegacyProperties[key]) {
            key = FeatureHashLegacyProperties[key];
          }
          feature.set(key, value);
        }
      }
      if (splitIndex >= 0) {
        var stylesText = attributesAndStylesText.substring(splitIndex + 1);
        if (this.setStyle_) {
          setStyleInFeature_(stylesText, feature);
        } else {
          setStyleProperties_(stylesText, feature);
        }
      }
    }
    return feature;
  };


  /**
   * Read multiple features from a logical sequence of characters.
   * @param {string} text Text.
   * @param {olx.format.ReadOptions=} opt_options Read options.
   * @return {Array.<ol.Feature>} Features.
   * @override
   * @protected
   */
  readFeaturesFromText(text, opt_options) {
    console.assert(text[0] === 'F');
    /** @type {Array.<ol.Feature>} */
    var features = [];
    text = text.substring(1);
    while (text.length > 0) {
      var index = text.indexOf(')');
      console.assert(index >= 0);
      var feature = this.readFeatureFromText(
          text.substring(0, index + 1), opt_options);
      features.push(feature);
      text = text.substring(index + 1);
    }
    return features;
  };


  /**
   * Read a geometry from a logical sequence of characters.
   * @param {string} text Text.
   * @param {olx.format.ReadOptions=} opt_options Read options.
   * @return {ol.geom.Geometry} Geometry.
   * @override
   * @protected
   */
  readGeometryFromText(text, opt_options) {
    var geometryReader = GEOMETRY_READERS_[text[0]];
    console.assert(geometryReader !== undefined);
    this.prevX_ = 0;
    this.prevY_ = 0;
    return geometryReader.call(this, text);
  };


  /**
   * Encode a feature into a logical sequence of characters.
   * @param {ol.Feature} feature Feature.
   * @param {olx.format.ReadOptions=} opt_options Read options.
   * @return {string} Encoded feature.
   * @override
   * @protected
   */
  writeFeatureText(feature, opt_options) {
    var /** @type {Array.<string>} */ encodedParts = [];

    // encode geometry

    var encodedGeometry = '';
    var geometry = feature.getGeometry();
    if (geometry !== undefined && geometry  !== null) {
      encodedGeometry = this.writeGeometryText(geometry, opt_options);
    }

    if (encodedGeometry.length > 0) {
      // remove the final bracket
      console.assert(encodedGeometry[encodedGeometry.length - 1] === ')');
      encodedGeometry = encodedGeometry.substring(0, encodedGeometry.length - 1);
      encodedParts.push(encodedGeometry);
    }

    // encode properties

    var /** @type {Array.<string>} */ encodedProperties = [];
    /**
     * @param {*} value Value.
     * @param {string} key Key.
     */
    var f = function(value, key) {
      if (key !== feature.getGeometryName()) {
        if (encodedProperties.length !== 0) {
          encodedProperties.push('\'');
        }
        var encoded = encodeURIComponent(
            key.replace(/[()'*]/g, '_') + '*' +
            value.toString().replace(/[()'*]/g, '_'));
        encodedProperties.push(encoded);
      }
    };
    var obj = this.propertiesFunction_(feature);
    for (var key in obj) {
      f(obj[key], key);
    }

    if (encodedProperties.length > 0) {
      encodedParts.push('~');
      Array.prototype.push.apply(encodedParts, encodedProperties);
    }

    // encode styles

    if (this.encodeStyles_) {
      var styleFunction = feature.getStyleFunction();
      if (styleFunction !== undefined) {
        var styles = styleFunction.call(feature, 0);
        if (styles !== null) {
          var encodedStyles = [];
          styles = Array.isArray(styles) ? styles : [styles];
          encodeStyles_(
              styles, geometry.getType(), encodedStyles);
          if (encodedStyles.length > 0) {
            encodedParts.push('~');
            Array.prototype.push.apply(encodedParts, encodedStyles);
          }
        }
      }
    }

    // append the closing bracket and return the encoded feature

    encodedParts.push(')');
    return encodedParts.join('');
  };


  /**
   * Encode an array of features into a logical sequence of characters.
   * @param {Array.<ol.Feature>} features Feature.
   * @param {olx.format.ReadOptions=} opt_options Read options.
   * @return {string} Encoded features.
   * @override
   * @protected
   */
  writeFeaturesText(features, opt_options) {
    var textArray = [];
    if (features.length > 0) {
      textArray.push('F');
      for (var i = 0, ii = features.length; i < ii; ++i) {
        textArray.push(this.writeFeatureText(features[i], opt_options));
      }
    }
    return textArray.join('');
  };


  /**
   * Encode a geometry into a logical sequence of characters.
   * @param {ol.geom.Geometry} geometry Geometry.
   * @param {olx.format.ReadOptions=} opt_options Read options.
   * @return {string} Encoded geometry.
   * @override
   * @protected
   */
  writeGeometryText(geometry, opt_options) {
    var geometryWriter = GEOMETRY_WRITERS_[
        geometry.getType()];
    console.assert(geometryWriter !== undefined);
    var transformedGeometry = /** @type {ol.geom.Geometry} */
        (transformWithOptions(geometry, true, opt_options));
    this.prevX_ = 0;
    this.prevY_ = 0;
    return geometryWriter.call(this, transformedGeometry);
  };
}



/**
 * Characters used to encode the coordinates. The characters "~", "'", "("
 * and ")" are not part of this character set, and used as separators (for
 * example to separate the coordinates from the feature properties).
 * @const
 * @private
 */
  CHAR64_ =
  '.-_!*ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghjkmnpqrstuvwxyz';


/**
* @const
* @private
*/
ACCURACY_ = 1;


/**
* Get features's properties.
* @param {ol.Feature} feature Feature.
* @return {Object.<string, (string|number)>} The feature properties to
* serialize.
* @private
*/
function defaultPropertiesFunction_(feature) {
 return feature.getProperties();
};


/**
* Sign then encode a number.
* @param {number} num Number.
* @return {string} String.
* @private
*/
function encodeSignedNumber_(num) {
 var signedNum = num << 1;
 if (num < 0) {
   signedNum = ~(signedNum);
 }
 return encodeNumber_(signedNum);
};


/**
* Transform a number into a logical sequence of characters.
* @param {number} num Number.
* @return {string} String.
* @private
*/
function encodeNumber_(num) {
 var encodedNumber = '';
 while (num >= 0x20) {
   encodedNumber += CHAR64_.charAt(
       0x20 | (num & 0x1f));
   num >>= 5;
 }
 encodedNumber += CHAR64_.charAt(num);
 return encodedNumber;
};


/**
* For a type of geometry, transforms an array of {@link ol.style.Style} into
* a logical sequence of characters and put the result into the given encoded
* styles's array.
* @param {Array.<ol.style.Style>} styles Styles.
* @param {ol.geom.GeometryType} geometryType Geometry type.
* @param {Array.<string>} encodedStyles Encoded styles array.
* @private
*/
function encodeStyles_(styles, geometryType, encodedStyles) {
 var styleType = FeatureHashStyleTypes[geometryType];
 console.assert(styleType !== undefined);
 for (var i = 0; i < styles.length; ++i) {
   var style = styles[i];
   var fillStyle = style.getFill();
   var imageStyle = style.getImage();
   var strokeStyle = style.getStroke();
   var textStyle = style.getText();
   if (styleType == FeatureHashStyleType.POLYGON) {
     if (fillStyle !== null) {
       encodeStylePolygon_(
           fillStyle, strokeStyle, encodedStyles);
     }
   } else if (styleType == FeatureHashStyleType.LINE_STRING) {
     if (strokeStyle !== null) {
       encodeStyleLine_(strokeStyle, encodedStyles);
     }
   } else if (styleType == FeatureHashStyleType.POINT) {
     if (imageStyle !== null) {
       encodeStylePoint_(imageStyle, encodedStyles);
     }
   }
   if (textStyle !== null) {
     encodeStyleText_(textStyle, encodedStyles);
   }
 }
};


/**
* Transform an {@link ol.style.Stroke} into a logical sequence of
* characters and put the result into the given encoded styles's array.
* @param {ol.style.Stroke} strokeStyle Stroke style.
* @param {Array.<string>} encodedStyles Encoded styles array.
* @private
*/
function encodeStyleLine_(strokeStyle, encodedStyles) {
 encodeStyleStroke_(strokeStyle, encodedStyles);
};


/**
* Transform an {@link ol.style.Circle} into a logical sequence of
* characters and put the result into the given encoded styles's array.
* @param {ol.style.Image} imageStyle Image style.
* @param {Array.<string>} encodedStyles Encoded styles array.
* @private
*/
function encodeStylePoint_(imageStyle, encodedStyles) {
 if (imageStyle instanceof olStyleCircle) {
   var radius = imageStyle.getRadius();
   if (encodedStyles.length > 0) {
     encodedStyles.push('\'');
   }
   encodedStyles.push(encodeURIComponent('pointRadius*' + radius));
   var fillStyle = imageStyle.getFill();
   if (fillStyle !== null) {
     encodeStyleFill_(fillStyle, encodedStyles);
   }
   var strokeStyle = imageStyle.getStroke();
   if (strokeStyle !== null) {
     encodeStyleStroke_(strokeStyle, encodedStyles);
   }
 }
};


/**
* Transform an {@link ol.style.Fill} and an {@link ol.style.Stroke} into
* a logical sequence of characters and put the result into the given
* encoded styles's array.
* @param {ol.style.Fill} fillStyle Fill style.
* @param {ol.style.Stroke} strokeStyle Stroke style.
* @param {Array.<string>} encodedStyles Encoded styles array.
* @private
*/
function encodeStylePolygon_(fillStyle, strokeStyle, encodedStyles) {
 encodeStyleFill_(fillStyle, encodedStyles);
 if (strokeStyle !== null) {
   encodeStyleStroke_(strokeStyle, encodedStyles);
 }
};


/**
* Transform an {@link ol.style.Fill} and optionally its properties into
* a logical sequence of characters and put the result into the given encoded
* styles's array.
* @param {ol.style.Fill} fillStyle Fill style.
* @param {Array.<string>} encodedStyles Encoded styles array.
* @param {string=} opt_propertyName Property name.
* @private
*/
function encodeStyleFill_(fillStyle, encodedStyles, opt_propertyName) {
 var propertyName = opt_propertyName !== undefined ?
     opt_propertyName : 'fillColor';
 var fillColor = fillStyle.getColor();
 if (fillColor !== null) {
   console.assert(Array.isArray(fillColor), 'only supporting fill colors');
   var fillColorRgba = colorAsArray(/** @type {Array<number>} */ (fillColor));
   console.assert(Array.isArray(fillColorRgba), 'fill color must be an array');
   var fillColorHex = ngeoUtils.rgbArrayToHex(/** @type {!Array<number>} */ (fillColorRgba));
   if (encodedStyles.length > 0) {
     encodedStyles.push('\'');
   }
   encodedStyles.push(
       encodeURIComponent(propertyName + '*' + fillColorHex));
 }
};


/**
* Transform an {@link ol.style.Stroke} into a logical sequence of
* characters and put the result into the given encoded styles's array.
* @param {ol.style.Stroke} strokeStyle Stroke style.
* @param {Array.<string>} encodedStyles Encoded styles array.
* @private
*/
function encodeStyleStroke_(strokeStyle, encodedStyles) {
 var strokeColor = strokeStyle.getColor();
 if (strokeColor !== null) {
   console.assert(Array.isArray(strokeColor));
   var strokeColorRgba = colorAsArray(/** @type {Array<number>} */ (strokeColor));
   console.assert(Array.isArray(strokeColorRgba), 'only supporting stroke colors');
   var strokeColorHex = ngeoUtils.rgbArrayToHex(/** @type {!Array<number>} */ (strokeColorRgba));
   if (encodedStyles.length > 0) {
     encodedStyles.push('\'');
   }
   encodedStyles.push(encodeURIComponent('strokeColor*' + strokeColorHex));
 }
 var strokeWidth = strokeStyle.getWidth();
 if (strokeWidth !== undefined) {
   if (encodedStyles.length > 0) {
     encodedStyles.push('\'');
   }
   encodedStyles.push(encodeURIComponent('strokeWidth*' + strokeWidth));
 }
};


/**
* Transform an {@link ol.style.Text} into a logical sequence of characters and
* put the result into the given encoded styles's array.
* @param {ol.style.Text} textStyle Text style.
* @param {Array.<string>} encodedStyles Encoded styles array.
* @private
*/
function encodeStyleText_(textStyle, encodedStyles) {
 var fontStyle = textStyle.getFont();
 if (fontStyle !== undefined) {
   var font = fontStyle.split(' ');
   if (font.length >= 3) {
     if (encodedStyles.length > 0) {
       encodedStyles.push('\'');
     }
     encodedStyles.push(encodeURIComponent('fontSize*' + font[1]));
   }
 }
 var fillStyle = textStyle.getFill();
 if (fillStyle !== null) {
   encodeStyleFill_(
       fillStyle, encodedStyles, 'fontColor');
 }
};


/**
* Read a logical sequence of characters and return a corresponding
* {@link ol.geom.LineString}.
* @param {string} text Text.
* @return {ol.geom.LineString} Line string.
* @this {app.draw.FeatureHash}
* @private
*/
function readLineStringGeometry_(text) {
 console.assert(text.substring(0, 2) === 'l(');
 console.assert(text[text.length - 1] == ')');
 text = text.substring(2, text.length - 1);
 var flatCoordinates = this.decodeCoordinates_(text);
 var lineString = new olGeomLineString(null);
 lineString.setFlatCoordinates(olGeomGeometryLayout.XY, flatCoordinates);
 return lineString;
};


/**
* Read a logical sequence of characters and return a corresponding
* {@link ol.geom.MultiLineString}.
* @param {string} text Text.
* @return {ol.geom.MultiLineString} Line string.
* @this {app.draw.FeatureHash}
* @private
*/
function readMultiLineStringGeometry_(text) {
 console.assert(text.substring(0, 2) === 'L(');
 console.assert(text[text.length - 1] == ')');
 text = text.substring(2, text.length - 1);
 var flatCoordinates = [];
 var ends = [];
 var lineStrings = text.split('\'');
 for (var i = 0, ii = lineStrings.length; i < ii; ++i) {
   flatCoordinates = this.decodeCoordinates_(lineStrings[i], flatCoordinates);
   ends[i] = flatCoordinates.length;
 }
 var multiLineString = new olGeomMultiLineString(null);
 multiLineString.setFlatCoordinates(
     olGeomGeometryLayout.XY, flatCoordinates, ends);
 return multiLineString;
};


/**
* Read a logical sequence of characters and return a corresponding
* {@link ol.geom.Point}.
* @param {string} text Text.
* @return {ol.geom.Point} Point.
* @this {app.draw.FeatureHash}
* @private
*/
function readPointGeometry_(text) {
 console.assert(text.substring(0, 2) === 'p(');
 console.assert(text[text.length - 1] == ')');
 text = text.substring(2, text.length - 1);
 var flatCoordinates = this.decodeCoordinates_(text);
 console.assert(flatCoordinates.length === 2);
 var point = new olGeomPoint(null);
 point.setFlatCoordinates(olGeomGeometryLayout.XY, flatCoordinates);
 return point;
};


/**
* Read a logical sequence of characters and return a corresponding
* {@link ol.geom.MultiPoint}.
* @param {string} text Text.
* @return {ol.geom.MultiPoint} MultiPoint.
* @this {app.draw.FeatureHash}
* @private
*/
function readMultiPointGeometry_(text) {
 console.assert(text.substring(0, 2) === 'P(');
 console.assert(text[text.length - 1] == ')');
 text = text.substring(2, text.length - 1);
 var flatCoordinates = this.decodeCoordinates_(text);
 var multiPoint = new olGeomMultiPoint(null);
 multiPoint.setFlatCoordinates(olGeomGeometryLayout.XY, flatCoordinates);
 return multiPoint;
};


/**
* Read a logical sequence of characters and return a corresponding
* {@link ol.geom.Polygon}.
* @param {string} text Text.
* @return {ol.geom.Polygon} Polygon.
* @this {app.draw.FeatureHash}
* @private
*/
function readPolygonGeometry_(text) {
 console.assert(text.substring(0, 2) === 'a(');
 console.assert(text[text.length - 1] == ')');
 text = text.substring(2, text.length - 1);
 var flatCoordinates = [];
 var ends = [];
 var rings = text.split('\'');
 for (var i = 0, ii = rings.length; i < ii; ++i) {
   flatCoordinates = this.decodeCoordinates_(rings[i], flatCoordinates);
   var end = flatCoordinates.length;
   if (i === 0) {
     flatCoordinates[end++] = flatCoordinates[0];
     flatCoordinates[end++] = flatCoordinates[1];
   } else {
     flatCoordinates[end++] = flatCoordinates[ends[i - 1]];
     flatCoordinates[end++] = flatCoordinates[ends[i - 1] + 1];
   }
   ends[i] = end;
 }
 var polygon = new olGeomPolygon(null);
 polygon.setFlatCoordinates(olGeomGeometryLayout.XY, flatCoordinates, ends);
 return polygon;
};


/**
* Read a logical sequence of characters and return a corresponding
* {@link ol.geom.MultiPolygon}.
* @param {string} text Text.
* @return {ol.geom.MultiPolygon} MultiPolygon.
* @this {app.draw.FeatureHash}
* @private
*/
function readMultiPolygonGeometry_(text) {
 console.assert(text.substring(0, 2) === 'A(');
 console.assert(text[text.length - 1] == ')');
 text = text.substring(2, text.length - 1);
 var flatCoordinates = [];
 var endss = [];
 var polygons = text.split(')(');
 for (var i = 0, ii = polygons.length; i < ii; ++i) {
   var rings = polygons[i].split('\'');
   var ends = endss[i] = [];
   for (var j = 0, jj = rings.length; j < jj; ++j) {
     flatCoordinates = this.decodeCoordinates_(rings[j], flatCoordinates);
     var end = flatCoordinates.length;
     if (j === 0) {
       flatCoordinates[end++] = flatCoordinates[0];
       flatCoordinates[end++] = flatCoordinates[1];
     } else {
       flatCoordinates[end++] = flatCoordinates[ends[j - 1]];
       flatCoordinates[end++] = flatCoordinates[ends[j - 1] + 1];
     }
     ends[j] = end;
   }
 }
 var multipolygon = new olGeomMultiPolygon(null);
 multipolygon.setFlatCoordinates(
     olGeomGeometryLayout.XY, flatCoordinates, endss);
 return multipolygon;
};


/**
* DEPRECATED - Use the `ngeo.FeatureHelper` instead in combination with the
* `setStyle: false` option.
*
* Read a logical sequence of characters and apply the decoded style on the
* given feature.
* @param {string} text Text.
* @param {ol.Feature} feature Feature.
* @private
*/
function setStyleInFeature_(text, feature) {
 if (text == '') {
   return;
 }
 var fillColor, fontSize, fontColor, pointRadius, strokeColor, strokeWidth;
 var properties = getStyleProperties_(text, feature);
 fillColor = properties['fillColor'];
 fontSize = properties['fontSize'];
 fontColor = properties['fontColor'];
 pointRadius = properties['pointRadius'];
 strokeColor = properties['strokeColor'];
 strokeWidth = properties['strokeWidth'];

 var fillStyle = null;
 if (fillColor !== undefined) {
   fillStyle = new olStyleFill({
     color: /** @type {Array<number>|string} */ (fillColor)
   });
 }
 var strokeStyle = null;
 if (strokeColor !== undefined && strokeWidth !== undefined) {
   strokeStyle = new olStyleStroke({
     color: /** @type {Array<number>|string} */ (strokeColor),
     width: /** @type {number} */ (strokeWidth)
   });
 }
 var imageStyle = null;
 if (pointRadius !== undefined) {
   imageStyle = new olStyleCircle({
     radius: /** @type {number} */ (pointRadius),
     fill: fillStyle,
     stroke: strokeStyle
   });
   fillStyle = strokeStyle = null;
 }
 var textStyle = null;
 if (fontSize !== undefined && fontColor !== undefined) {
   textStyle = new olStyleText({
     font: fontSize + ' sans-serif',
     fill: new olStyleFill({
       color: /** @type {Array<number>|string} */ (fontColor)
     })
   });
 }
 var style = new olStyleStyle({
   fill: fillStyle,
   image: imageStyle,
   stroke: strokeStyle,
   text: textStyle
 });
 feature.setStyle(style);
};


/**
* Read a logical sequence of characters and apply the decoded result as
* style properties for the feature. Legacy keys are converted to the new ones
* for compatibility.
* @param {string} text Text.
* @param {ol.Feature} feature Feature.
* @private
*/
function setStyleProperties_(text, feature) {

 var properties = getStyleProperties_(text, feature);
 var geometry = feature.getGeometry();

 // Deal with legacy properties
 if (geometry instanceof olGeomPoint) {
   if (properties['isLabel'] ||
       properties[ngeoFormatFeatureProperties.IS_TEXT]) {
     delete properties['strokeColor'];
     delete properties['fillColor'];
   } else {
     delete properties['fontColor'];
     delete properties['fontSize'];
   }
 } else {
   delete properties['fontColor'];

   if (geometry instanceof olGeomLineString) {
     delete properties['fillColor'];
     delete properties['fillOpacity'];
   }
 }

 // Convert font size from px to pt
 if (properties['fontSize']) {
   var fontSize = parseFloat(properties['fontSize']);
   if (properties['fontSize'].indexOf('px') !== -1) {
     fontSize = Math.round(fontSize / 1.333333);
   }
   properties['fontSize'] = fontSize;
 }

 // Convert legacy properties
 var clone = {};
 for (var key in properties) {
   var value = properties[key];
   if (FeatureHashLegacyProperties[key]) {
     clone[FeatureHashLegacyProperties[key]] = value;
   } else {
     clone[key] = value;
   }
 }

 feature.setProperties(clone);
};


/**
* Cast values in the correct type depending on the property.
* @param {string} key Key.
* @param {string} value Value.
* @return {number|boolean|string} The casted value corresponding to the key.
* @private
*/
function castValue_(key, value) {
 var numProperties = [
   ngeoFormatFeatureProperties.ANGLE,
   ngeoFormatFeatureProperties.OPACITY,
   ngeoFormatFeatureProperties.SIZE,
   ngeoFormatFeatureProperties.STROKE,
   'pointRadius',
   'strokeWidth'
 ];
 var boolProperties = [
   ngeoFormatFeatureProperties.IS_CIRCLE,
   ngeoFormatFeatureProperties.IS_RECTANGLE,
   ngeoFormatFeatureProperties.IS_TEXT,
   ngeoFormatFeatureProperties.SHOW_MEASURE,
   'isCircle',
   'isRectangle',
   'isLabel',
   'showMeasure'
 ];

 if (arrayIncludes(numProperties, key)) {
   return +value;
 } else if (arrayIncludes(boolProperties, key)) {
   return value === 'true';
 } else {
   return value;
 }
};


/**
* From a logical sequence of characters, create and return an object of
* style properties for a feature. The values are cast in the correct type
* depending on the property. Some properties are also deleted when they don't
* match the geometry of the feature.
* @param {string} text Text.
* @param {ol.Feature} feature Feature.
* @return {Object.<string, boolean|number|string>} The style properties for
*     the feature.
* @private
*/
function getStyleProperties_(text, feature) {
 var parts = text.split('\'');
 var properties = {};

 for (var i = 0; i < parts.length; ++i) {
   var part = decodeURIComponent(parts[i]);
   var keyVal = part.split('*');
   console.assert(keyVal.length === 2);
   var key = keyVal[0];
   var val = keyVal[1];

   properties[key] = castValue_(key, val);
 }

 return properties;
};


/**
* Encode a {@link ol.geom.LineString} geometry into a logical sequence of
* characters.
* @param {ol.geom.Geometry} geometry Geometry.
* @return {string} Encoded geometry.
* @this {app.draw.FeatureHash}
* @private
*/
function writeLineStringGeometry_(geometry) {
 console.assert(geometry instanceof olGeomLineString);
 var flatCoordinates = /** @type {ol.geom.LineString} */ (geometry).getFlatCoordinates();
 var stride = /** @type {ol.geom.LineString} */ (geometry).getStride();
 var end = flatCoordinates.length;
 return 'l(' + this.encodeCoordinates_(flatCoordinates, stride, 0, end) + ')';
};


/**
* Encode a {@link ol.geom.MultiLineString} geometry into a logical sequence
* of characters.
* @param {ol.geom.Geometry} geometry Geometry.
* @return {string} Encoded geometry.
* @this {app.draw.FeatureHash}
* @private
*/
function writeMultiLineStringGeometry_(geometry) {
 console.assert(geometry instanceof olGeomMultiLineString);
 var ends = /** @type {ol.geom.MultiLineString} */ (geometry).getEnds();
 var lineStringCount = ends.length;
 var flatCoordinates = /** @type {ol.geom.MultiLineString} */ (geometry).getFlatCoordinates();
 var stride = /** @type {ol.geom.MultiLineString} */ (geometry).getStride();
 var offset = 0;
 var textArray = ['L('];
 for (var i = 0; i < lineStringCount; ++i) {
   var end = ends[i];
   var text = this.encodeCoordinates_(flatCoordinates, stride, offset, end);
   if (i !== 0) {
     textArray.push('\'');
   }
   textArray.push(text);
   offset = end;
 }
 textArray.push(')');
 return textArray.join('');
};


/**
* Encode a {@link ol.geom.Point} geometry into a logical sequence of
* characters.
* @param {ol.geom.Geometry} geometry Geometry.
* @return {string} Encoded geometry.
* @this {app.draw.FeatureHash}
* @private
*/
function writePointGeometry_(geometry) {
 console.assert(geometry instanceof olGeomPoint);
 var flatCoordinates = /** @type {ol.geom.Point} */ (geometry).getFlatCoordinates();
 var stride = /** @type {ol.geom.Point} */ (geometry).getStride();
 var end = flatCoordinates.length;
 return 'p(' + this.encodeCoordinates_(flatCoordinates, stride, 0, end) + ')';
};


/**
* Encode an {@link ol.geom.MultiPoint} geometry into a logical sequence
* of characters.
* @param {ol.geom.Geometry} geometry Geometry.
* @return {string} Encoded geometry.
* @this {app.draw.FeatureHash}
* @private
*/
function writeMultiPointGeometry_(geometry) {
 console.assert(geometry instanceof olGeomMultiPoint);
 var flatCoordinates = /** @type {ol.geom.MultiPoint} */ (geometry).getFlatCoordinates();
 var stride = /** @type {ol.geom.MultiPoint} */ (geometry).getStride();
 var end = flatCoordinates.length;
 return 'P(' + this.encodeCoordinates_(flatCoordinates, stride, 0, end) + ')';
};


/**
* Helper to encode an {@link ol.geom.Polygon} geometry.
* @param {Array.<number>} flatCoordinates Flat coordinates.
* @param {number} stride Stride.
* @param {number} offset Offset.
* @param {Array.<number>} ends Ends.
* @param {Array.<string>} textArray Text array.
* @return {number} The new offset.
* @this {app.draw.FeatureHash}
* @private
*/
function encodeRings_(flatCoordinates, stride, offset, ends, textArray) {
 var linearRingCount = ends.length;
 for (var i = 0; i < linearRingCount; ++i) {
   // skip the "closing" point
   var end = ends[i] - stride;
   var text = this.encodeCoordinates_(flatCoordinates, stride, offset, end);
   if (i !== 0) {
     textArray.push('\'');
   }
   textArray.push(text);
   offset = ends[i];
 }
 return offset;
};


/**
* Encode an {@link ol.geom.Polygon} geometry into a logical sequence
* of characters.
* @param {ol.geom.Geometry} geometry Geometry.
* @return {string} Encoded geometry.
* @this {app.draw.FeatureHash}
* @private
*/
function writePolygonGeometry_(geometry) {
 console.assert(geometry instanceof olGeomPolygon);
 var flatCoordinates = /** @type {ol.geom.Polygon} */ (geometry).getFlatCoordinates();
 var stride = /** @type {ol.geom.Polygon} */ (geometry).getStride();
 var ends = /** @type {ol.geom.Polygon} */ (geometry).getEnds();
 var offset = 0;
 var textArray = ['a('];
 encodeRings_.call(this,
     flatCoordinates, stride, offset, ends, textArray);
 textArray.push(')');
 return textArray.join('');
};


/**
* Encode an {@link ol.geom.MultiPoligon} geometry into a logical sequence of
* characters.
* @param {ol.geom.Geometry} geometry Geometry.
* @return {string} Encoded geometry.
* @this {app.draw.FeatureHash}
* @private
*/
function writeMultiPolygonGeometry_(geometry) {
 console.assert(geometry instanceof olGeomMultiPolygon);
 var flatCoordinates = /** @type {ol.geom.MultiPolygon} */ (geometry).getFlatCoordinates();
 var stride = /** @type {ol.geom.MultiPolygon} */ (geometry).getStride();
 var endss = /** @type {ol.geom.MultiPolygon} */ (geometry).getEndss();
 var polygonCount = endss.length;
 var offset = 0;
 var textArray = ['A'];
 for (var i = 0; i < polygonCount; ++i) {
   var ends = endss[i];
   textArray.push('(');
   offset = encodeRings_.call(this,
       flatCoordinates, stride, offset, ends, textArray);
   textArray.push(')');
 }
 return textArray.join('');
};


/**
* @const
* @private
* @type {Object.<string, function(string):ol.geom.Geometry>}
*/
GEOMETRY_READERS_ = {
 'P': readMultiPointGeometry_,
 'L': readMultiLineStringGeometry_,
 'A': readMultiPolygonGeometry_,
 'l': readLineStringGeometry_,
 'p': readPointGeometry_,
 'a': readPolygonGeometry_
};


/**
* @const
* @private
* @type {Object.<string, function(ol.geom.Geometry):string>}
*/
GEOMETRY_WRITERS_ = {
 'MultiLineString': writeMultiLineStringGeometry_,
 'MultiPoint': writeMultiPointGeometry_,
 'MultiPolygon': writeMultiPolygonGeometry_,
 'LineString': writeLineStringGeometry_,
 'Point': writePointGeometry_,
 'Polygon': writePolygonGeometry_
};

export default FeatureHash;
