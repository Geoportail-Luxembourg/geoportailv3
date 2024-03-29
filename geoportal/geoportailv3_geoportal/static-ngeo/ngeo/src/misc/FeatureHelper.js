/**
 * @module ngeo.misc.FeatureHelper
 */
import googAsserts from 'goog/asserts.js';
import ngeoMiscFilters from 'ngeo/misc/filters.js';

/** @suppress {extraRequire} */
import ngeoDownloadService from 'ngeo/download/service.js';

import ngeoFormatFeatureProperties from 'ngeo/format/FeatureProperties.js';
import ngeoGeometryType from 'ngeo/GeometryType.js';
import ngeoInteractionMeasure from 'ngeo/interaction/Measure.js';
import ngeoInteractionMeasureAzimut from 'ngeo/interaction/MeasureAzimut.js';
import * as olArray from 'ol/array.js';
import * as olColor from 'ol/color.js';
import * as olExtent from 'ol/extent.js';
import olFeature from 'ol/Feature.js';
import olGeomLineString from 'ol/geom/LineString.js';
import olGeomMultiLineString from 'ol/geom/MultiLineString.js';
import olGeomMultiPoint from 'ol/geom/MultiPoint.js';
import olGeomPoint from 'ol/geom/Point.js';
import olGeomPolygon from 'ol/geom/Polygon.js';
import olGeomMultiPolygon from 'ol/geom/MultiPolygon.js';
import olFormatGPX from 'ol/format/GPX.js';
import olFormatKML from 'ol/format/KML.js';
import olStyleCircle from 'ol/style/Circle.js';
import olStyleFill from 'ol/style/Fill.js';
import olStyleRegularShape from 'ol/style/RegularShape.js';
import olStyleStroke from 'ol/style/Stroke.js';
import olStyleStyle from 'ol/style/Style.js';
import olStyleText from 'ol/style/Text.js';

/**
 * Provides methods for features, such as:
 *  - style setting / getting
 *  - measurement
 *  - export
 *
 * @constructor
 * @struct
 * @param {!angular.$injector} $injector Main injector.
 * @param {!angular.$filter} $filter Angular filter.
 * @ngdoc service
 * @ngname ngeoFeatureHelper
 * @ngInject
 */
const exports = function($injector, $filter) {

  /**
   * @type {!angular.$filter}
   * @private
   */
  this.$filter_ = $filter;

  /**
   * @type {number|undefined}
   * @private
   */
  this.decimals_ = undefined;
  if ($injector.has('ngeoMeasureDecimals')) {
    this.decimals_ = $injector.get('ngeoMeasureDecimals');
  }


  /**
   * @type {number|undefined}
   * @private
   */
  this.precision_ = undefined;
  if ($injector.has('ngeoMeasurePrecision')) {
    this.precision_ = $injector.get('ngeoMeasurePrecision');
  }

  /**
   * @type {!ngeox.number}
   */
  this.numberFormat_ = /** @type {ngeox.number} */ ($filter('number'));

  /**
   * @type {!ngeox.unitPrefix}
   */
  this.unitPrefixFormat_ = /** @type {ngeox.unitPrefix} */ ($filter('ngeoUnitPrefix'));

  /**
   * @type {!ngeox.numberCoordinates}
   */
  this.ngeoNumberCoordinates_ = /** @type {ngeox.numberCoordinates} */ ($filter('ngeoNumberCoordinates'));

  /**
   * Filter function to display point coordinates or null to don't use any filter.
   * @type {function(*):string|null}
   * @private
   */
  this.pointFilterFn_ = null;

  /**
   * Arguments to apply to the point filter function.
   * @type {Array.<*>}
   * @private
   */
  this.pointFilterArgs_ = [];

  if ($injector.has('ngeoPointfilter')) {
    const filterElements = $injector.get('ngeoPointfilter').split(':');
    const filterName = filterElements.shift();
    const filter = this.$filter_(filterName);
    googAsserts.assertFunction(filter);
    this.pointFilterFn_ = filter;
    this.pointFilterArgs_ = filterElements;
  } else {
    this.pointFilterFn_ = null;
  }

  /**
   * @type {!ol.proj.Projection}
   * @private
   */
  this.projection_;

  /**
   * Download service.
   * @type {ngeox.Download}
   * @private
   */
  this.download_ = $injector.get('ngeoDownload');

};


/**
 * @param {!ol.proj.Projection} projection Projection.
 * @export
 */
exports.prototype.setProjection = function(projection) {
  this.projection_ = projection;
};


// === STYLE METHODS ===


/**
 * Set the style of a feature using its inner properties and depending on
 * its geometry type.
 * @param {!ol.Feature} feature Feature.
 * @param {boolean=} opt_select Whether the feature should be rendered as
 *     selected, which includes additional vertex and halo styles.
 * @export
 */
exports.prototype.setStyle = function(feature, opt_select) {
  const styles = this.getStyle(feature);
  if (opt_select) {
    if (this.supportsVertex_(feature)) {
      styles.push(this.getVertexStyle());
    }
    styles.unshift(this.getHaloStyle_(feature));
  }
  feature.setStyle(styles);
};


/**
 * Create and return a style object from a given feature using its inner
 * properties and depending on its geometry type.
 * @param {!ol.Feature} feature Feature.
 * @return {!Array.<!ol.style.Style>} The style object.
 * @export
 */
exports.prototype.getStyle = function(feature) {
  const type = this.getType(feature);
  let style;

  switch (type) {
    case ngeoGeometryType.LINE_STRING:
      style = this.getLineStringStyle_(feature);
      break;
    case ngeoGeometryType.POINT:
      style = this.getPointStyle_(feature);
      break;
    case ngeoGeometryType.CIRCLE:
    case ngeoGeometryType.POLYGON:
    case ngeoGeometryType.RECTANGLE:
      style = this.getPolygonStyle_(feature);
      break;
    case ngeoGeometryType.TEXT:
      style = this.getTextStyle_(feature);
      break;
    default:
      break;
  }

  googAsserts.assert(style, 'Style should be thruthy');

  let styles;
  if (style.constructor === Array) {
    styles = /** @type {!Array.<!ol.style.Style>}*/ (style);
  } else {
    styles = [style];
  }

  return styles;
};


/**
 * @param {!ol.Feature} feature Feature with linestring geometry.
 * @return {!Array.<!ol.style.Style>} Style.
 * @private
 */
exports.prototype.getLineStringStyle_ = function(feature) {
  const strokeWidth = this.getStrokeProperty(feature);
  const showLabel = this.getShowLabelProperty(feature);
  const showMeasure = this.getShowMeasureProperty(feature);
  const color = this.getRGBAColorProperty(feature);

  const styles = [new olStyleStyle({
    stroke: new olStyleStroke({
      color: color,
      width: strokeWidth
    })
  })];
  //Label Style
  const textLabelValues = [];
  if (showMeasure) {
    textLabelValues.push(this.getMeasure(feature));
  }
  if (showLabel) {
    textLabelValues.push(this.getNameProperty(feature));
  }
  if (showLabel ||  showMeasure) {
    // display both label using  \n
    const textLabelValue = textLabelValues.join('\n');
    styles.push(new olStyleStyle({
      text: this.createTextStyle_({
        text: textLabelValue
      })
    }));
  }
  return styles;
};


/**
 * @param {!ol.Feature} feature Feature with point geometry.
 * @return {!Array.<!ol.style.Style>} Style.
 * @private
 */
exports.prototype.getPointStyle_ = function(feature) {
  const size = this.getSizeProperty(feature);
  const color = this.getRGBAColorProperty(feature);
  const showLabel = this.getShowLabelProperty(feature);
  const showMeasure = this.getShowMeasureProperty(feature);
  const styles = [new olStyleStyle({
    image: new olStyleCircle({
      radius: size,
      fill: new olStyleFill({
        color: color
      })
    })
  })];
  // Label Style
  const textLabelValues = [];
  if (showMeasure) {
    textLabelValues.push(this.getMeasure(feature));
  }
  if (showLabel) {
    textLabelValues.push(this.getNameProperty(feature));
  }
  if (showLabel ||  showMeasure) {
    // display both label using  \n
    const textLabelValue = textLabelValues.join('\n');
    const font_size = 10;
    // https://reeddesign.co.uk/test/points-pixels.html
    const point_to_px = 1.3;
    styles.push(new olStyleStyle({
      text: this.createTextStyle_({
        text: textLabelValue,
        size: font_size,
        offsetY: -(size + (font_size / 2) * textLabelValues.length * point_to_px + 4)
      })
    }));
  }
  return styles;
};


/**
 * Get an optional number feature attribute.
 *
 * @param {!ol.Feature} feature Feature.
 * @param {string} attrib The attribute name.
 * @return {number|undefined}, The attribute value
 */
exports.prototype.optNumber = function(feature, attrib) {
  const value = feature.get(attrib);
  if (value !== undefined) {
    if (typeof value == 'string') {
      return +value;
    } else {
      return googAsserts.assertNumber(value);
    }
  } else {
    return undefined;
  }
};


/**
 * Get a number feature attribute.
 *
 * @param {!ol.Feature} feature Feature.
 * @param {string} attrib The attribute name.
 * @return {number}, The attribute value
 */
exports.prototype.getNumber = function(feature, attrib) {
  const value = feature.get(attrib);
  if (typeof value == 'string') {
    return +value;
  } else {
    return googAsserts.assertNumber(value);
  }
};


/**
 * @param {!ol.Feature} feature Feature with polygon geometry.
 * @return {!Array.<!ol.style.Style>} Style.
 * @private
 */
exports.prototype.getPolygonStyle_ = function(feature) {
  const strokeWidth = this.getStrokeProperty(feature);
  const opacity = this.getOpacityProperty(feature);
  const color = this.getRGBAColorProperty(feature);
  const showLabel = this.getShowLabelProperty(feature);
  const showMeasure = this.getShowMeasureProperty(feature);

  // fill color with opacity
  const fillColor = color.slice();
  fillColor[3] = opacity;

  const azimut = this.optNumber(feature, ngeoFormatFeatureProperties.AZIMUT);

  const styles = [new olStyleStyle({
    fill: new olStyleFill({
      color: fillColor
    }),
    stroke: new olStyleStroke({
      color: color,
      width: strokeWidth
    })
  })];
  if (showMeasure || showLabel) {
    if (showMeasure && azimut !== undefined) {
      // Radius style:
      const line = this.getRadiusLine(feature, azimut);
      const length = ngeoInteractionMeasure.prototype.getFormattedLength(
        line, this.projection_, this.precision_, this.unitPrefixFormat_);

      styles.push(new olStyleStyle({
        geometry: line,
        fill: new olStyleFill({
          color: fillColor
        }),
        stroke: new olStyleStroke({
          color: color,
          width: strokeWidth
        }),
        text: this.createTextStyle_({
          text: length,
          angle: ((azimut % 180) + 180) % 180 - 90
        })
      }));

      // Azimut style
      styles.push(new olStyleStyle({
        geometry: new olGeomPoint(line.getLastCoordinate()),
        text: this.createTextStyle_({
          text: `${this.numberFormat_(azimut, this.decimals_)}°`,
          size: 10,
          offsetX: Math.cos((azimut - 90) * Math.PI / 180) * 20,
          offsetY: Math.sin((azimut - 90) * Math.PI / 180) * 20
        })
      }));

      //Label Style
      if (showLabel) {
        styles.push(new olStyleStyle({
          text: this.createTextStyle_({
            text: this.getNameProperty(feature),
            offsetY: -8,
            exceedLength: true
          })
        }));
      }
    } else {
      //Label Style
      const textLabelValues = [];
      if (showMeasure) {
        textLabelValues.push(this.getMeasure(feature));
      }
      if (showLabel) {
        textLabelValues.push(this.getNameProperty(feature));
      }
      if (showLabel ||  showMeasure) {
        // display both label using  \n
        const textLabelValue = textLabelValues.join('\n');
        styles.push(new olStyleStyle({
          text: this.createTextStyle_({
            text: textLabelValue,
            exceedLength: true
          })
        }));
      }
    }
  }
  return styles;
};


/**
 * @param {!ol.Feature} feature Feature with point geometry, rendered as text.
 * @return {!ol.style.Style} Style.
 * @private
 */
exports.prototype.getTextStyle_ = function(feature) {

  return new olStyleStyle({
    text: this.createTextStyle_({
      text: this.getNameProperty(feature),
      size: this.getSizeProperty(feature),
      angle: this.getAngleProperty(feature),
      color: this.getRGBAColorProperty(feature),
      width: this.getStrokeProperty(feature)
    })
  });
};


/**
 * @param {!ol.Feature} feature Feature to create the editing styles with.
 * @return {!Array.<!ol.style.Style>} List of style.
 * @export
 */
exports.prototype.createEditingStyles = function(feature) {
  // (1) Style definition depends on geometry type
  const white = [255, 255, 255, 1];
  const blue = [0, 153, 255, 1];
  const width = 3;
  const styles = [];

  const geom = feature.getGeometry();
  console.assert(geom);
  const type = geom.getType();

  if (type === 'Point') {
    styles.push(
      new olStyleStyle({
        image: new olStyleCircle({
          radius: width * 2,
          fill: new olStyleFill({
            color: blue
          }),
          stroke: new olStyleStroke({
            color: white,
            width: width / 2
          })
        }),
        zIndex: Infinity
      })
    );
  } else {
    if (type === 'LineString') {
      styles.push(
        new olStyleStyle({
          stroke: new olStyleStroke({
            color: white,
            width: width + 2
          })
        })
      );
      styles.push(
        new olStyleStyle({
          stroke: new olStyleStroke({
            color: blue,
            width: width
          })
        })
      );
    } else {
      styles.push(
        new olStyleStyle({
          stroke: new olStyleStroke({
            color: blue,
            width: width / 2
          }),
          fill: new olStyleFill({
            color: [255, 255, 255, 0.5]
          })
        })
      );
    }

    // (2) Anything else than 'Point' requires the vertex style as well
    styles.push(this.getVertexStyle(true));
  }

  return styles;
};


/**
 * Create and return a style object to be used for vertex.
 * @param {boolean=} opt_incGeomFunc Whether to include the geometry function
 *     or not. One wants to use the geometry function when you want to draw
 *     the vertex of features that don't have point geometries. One doesn't
 *     want to include the geometry function if you just want to have the
 *     style object itself to be used to draw features that have point
 *     geometries. Defaults to `true`.
 * @return {!ol.style.Style} Style.
 * @export
 */
exports.prototype.getVertexStyle = function(opt_incGeomFunc) {
  const incGeomFunc = opt_incGeomFunc !== undefined ? opt_incGeomFunc : true;

  const options = {
    image: new olStyleRegularShape({
      radius: 6,
      points: 4,
      angle: Math.PI / 4,
      fill: new olStyleFill({
        color: [255, 255, 255, 0.5]
      }),
      stroke: new olStyleStroke({
        color: [0, 0, 0, 1]
      })
    })
  };

  if (incGeomFunc) {
    options.geometry = function(feature) {
      const geom = feature.getGeometry();

      if (geom.getType() == 'Point') {
        return;
      }

      let innerMultiCoordinates;
      let multiCoordinates = [];
      let coordinates = [];
      let i, ii;
      if (geom instanceof olGeomLineString) {
        coordinates = geom.getCoordinates();
      } else if (geom instanceof olGeomMultiLineString) {
        multiCoordinates = geom.getCoordinates();
      } else if (geom instanceof olGeomPolygon) {
        coordinates = geom.getCoordinates()[0];
      } else if (geom instanceof olGeomMultiPolygon) {
        innerMultiCoordinates = geom.getCoordinates();
      }

      if (innerMultiCoordinates) {
        for (i = 0, ii = innerMultiCoordinates.length; i < ii; i++) {
          multiCoordinates = multiCoordinates.concat(innerMultiCoordinates[i]);
        }
      }
      for (i = 0, ii = multiCoordinates.length; i < ii; i++) {
        coordinates = coordinates.concat(multiCoordinates[i]);
      }

      if (coordinates.length) {
        return new olGeomMultiPoint(coordinates);
      } else {
        return geom;
      }
    };
  }

  return new olStyleStyle(options);
};


/**
 * @param {!ol.Feature} feature Feature.
 * @return {boolean} Whether the feature supports vertex or not.
 * @private
 */
exports.prototype.supportsVertex_ = function(feature) {
  const supported = [
    ngeoGeometryType.LINE_STRING,
    ngeoGeometryType.POLYGON,
    ngeoGeometryType.RECTANGLE
  ];
  const type = this.getType(feature);
  return olArray.includes(supported, type);
};


/**
 * @param {!ol.Feature} feature Feature.
 * @return {!ol.style.Style} Style.
 * @private
 */
exports.prototype.getHaloStyle_ = function(feature) {
  const type = this.getType(feature);
  let style;
  const haloSize = 3;

  switch (type) {
    case ngeoGeometryType.POINT:
      const size = this.getSizeProperty(feature);
      style = new olStyleStyle({
        image: new olStyleCircle({
          radius: size + haloSize,
          fill: new olStyleFill({
            color: [255, 255, 255, 1]
          })
        })
      });
      break;
    case ngeoGeometryType.LINE_STRING:
    case ngeoGeometryType.CIRCLE:
    case ngeoGeometryType.POLYGON:
    case ngeoGeometryType.RECTANGLE:
      const strokeWidth = this.getStrokeProperty(feature);
      style = new olStyleStyle({
        stroke: new olStyleStroke({
          color: [255, 255, 255, 1],
          width: strokeWidth + haloSize * 2
        })
      });
      break;
    case ngeoGeometryType.TEXT:
      style = new olStyleStyle({
        text: this.createTextStyle_({
          text: this.getNameProperty(feature),
          size: this.getSizeProperty(feature),
          angle: this.getAngleProperty(feature),
          width: haloSize * 3
        })
      });
      break;
    default:
      break;
  }

  googAsserts.assert(style, 'Style should be thruthy');

  return style;
};


// === PROPERTY GETTERS ===

/**
 * Delete the unwanted ol3 properties from the current feature then return the
 * properties.
 * Also delete the 'ngeo_feature_type_' from the ngeo query system.
 * @param {!ol.Feature} feature Feature.
 * @return {!Object.<string, *>} Filtered properties of the current feature.
 * @export
 */
exports.getFilteredFeatureValues = function(feature) {
  const properties = feature.getProperties();
  delete properties['boundedBy'];
  delete properties[feature.getGeometryName()];
  delete properties['ngeo_feature_type_'];
  return properties;
};

/**
 * @param {ol.Feature} feature Feature.
 * @return {number} Angle.
 * @export
 */
exports.prototype.getAngleProperty = function(feature) {
  const angle = +(/** @type {string} */ (
    feature.get(ngeoFormatFeatureProperties.ANGLE)));
  googAsserts.assertNumber(angle);
  return angle;
};


/**
 * @param {!ol.Feature} feature Feature.
 * @return {string} Color.
 * @export
 */
exports.prototype.getColorProperty = function(feature) {

  const color = googAsserts.assertString(feature.get(ngeoFormatFeatureProperties.COLOR));

  googAsserts.assertString(color);

  return color;
};


/**
 * @param {!ol.Feature} feature Feature.
 * @return {ol.Color} Color.
 * @export
 */
exports.prototype.getRGBAColorProperty = function(feature) {
  return olColor.fromString(this.getColorProperty(feature));
};


/**
 * @param {!ol.Feature} feature Feature.
 * @return {string} Name.
 * @export
 */
exports.prototype.getNameProperty = function(feature) {
  const name = googAsserts.assertString(feature.get(ngeoFormatFeatureProperties.NAME));
  googAsserts.assertString(name);
  return name;
};


/**
 * @param {!ol.Feature} feature Feature.
 * @return {number} Opacity.
 * @export
 */
exports.prototype.getOpacityProperty = function(feature) {
  return this.getNumber(feature, ngeoFormatFeatureProperties.OPACITY);
};


/**
 * @param {!ol.Feature} feature Feature.
 * @return {boolean} Show measure.
 * @export
 */
exports.prototype.getShowMeasureProperty = function(feature) {
  let showMeasure = feature.get(ngeoFormatFeatureProperties.SHOW_MEASURE);
  if (showMeasure === undefined) {
    showMeasure = false;
  } else if (typeof showMeasure === 'string') {
    showMeasure = (showMeasure === 'true') ? true : false;
  }
  return googAsserts.assertBoolean(showMeasure);
};

/**
 * @param {!ol.Feature} feature Feature.
 * @return {boolean} Show feature label.
 * @export
 */
exports.prototype.getShowLabelProperty = function(feature) {
  let showLabel = feature.get(ngeoFormatFeatureProperties.SHOW_LABEL);
  if (showLabel === undefined) {
    showLabel = false;
  } else if (typeof showLabel === 'string') {
    showLabel = (showLabel === 'true') ? true : false;
  }
  return googAsserts.assertBoolean(showLabel);
};

/**
 * @param {!ol.Feature} feature Feature.
 * @return {number} Size.
 * @export
 */
exports.prototype.getSizeProperty = function(feature) {
  return this.getNumber(feature, ngeoFormatFeatureProperties.SIZE);
};


/**
 * @param {!ol.Feature} feature Feature.
 * @return {number} Stroke.
 * @export
 */
exports.prototype.getStrokeProperty = function(feature) {
  return this.getNumber(feature, ngeoFormatFeatureProperties.STROKE);
};


// === EXPORT ===


/**
 * Export features in the given format. The projection of the exported features
 * is: `EPSG:4326`.
 * @param {!Array.<!ol.Feature>} features Array of vector features.
 * @param {string} formatType Format type to export the features.
 * @export
 */
exports.prototype.export = function(features, formatType) {
  switch (formatType) {
    case exports.FormatType.GPX:
      this.exportGPX(features);
      break;
    case exports.FormatType.KML:
      this.exportKML(features);
      break;
    default:
      break;
  }
};


/**
 * Export features in GPX and download the result to the browser. The
 * projection of the exported features is: `EPSG:4326`.
 * @param {!Array.<!ol.Feature>} features Array of vector features.
 * @export
 */
exports.prototype.exportGPX = function(features) {
  const format = new olFormatGPX();
  const mimeType = 'application/gpx+xml';
  const fileName = 'export.gpx';
  this.export_(features, format, fileName, mimeType);
};


/**
 * Export features in KML and download the result to the browser. The
 * projection of the exported features is: `EPSG:4326`.
 * @param {!Array.<!ol.Feature>} features Array of vector features.
 * @export
 */
exports.prototype.exportKML = function(features) {
  const format = new olFormatKML();
  const mimeType = 'application/vnd.google-earth.kml+xml';
  const fileName = 'export.kml';
  this.export_(features, format, fileName, mimeType);
};


/**
 * Export features using a given format to a specific filename and download
 * the result to the browser. The projection of the exported features is:
 * `EPSG:4326`.
 * @param {!Array.<!ol.Feature>} features Array of vector features.
 * @param {!ol.format.Feature} format Format
 * @param {string} fileName Name of the file.
 * @param {string=} opt_mimeType Mime type. Defaults to 'text/plain'.
 * @private
 */
exports.prototype.export_ = function(features, format, fileName, opt_mimeType) {
  const mimeType = opt_mimeType !== undefined ? opt_mimeType : 'text/plain';

  // clone the features to apply the original style to the clone
  // (the original may have select style active)
  const clones = [];
  let clone;
  features.forEach((feature) => {
    clone = new olFeature(feature.getProperties());
    this.setStyle(clone, false);
    clones.push(clone);
  });

  const writeOptions = this.projection_ ? {
    dataProjection: 'EPSG:4326',
    featureProjection: this.projection_
  } : {};

  const data = format.writeFeatures(clones, writeOptions);
  this.download_(
    data, fileName, `${mimeType};charset=utf-8`);
};


// === OTHER UTILITY METHODS ===


/**
 * @param {!ngeox.style.TextOptions} options Options.
 * @return {!ol.style.Text} Style.
 * @private
 */
exports.prototype.createTextStyle_ = function(options) {
  if (options.angle) {
    const angle = options.angle !== undefined ? options.angle : 0;
    const rotation = angle * Math.PI / 180;
    options.rotation = rotation;
    delete options.angle;
  }

  options.font = ['normal', `${options.size || 10}pt`, 'Arial'].join(' ');

  if (options.color) {
    options.fill = new olStyleFill({color: options.color || [0, 0, 0, 1]});
    delete options.color;
  }

  options.stroke = new olStyleStroke({
    color: [255, 255, 255, 1],
    width: options.width || 3
  });
  delete options.width;

  return new olStyleText(options);
};


/**
 * Get the measure of the given feature as a string. For points, you can format
 * the result by setting a filter to apply on the coordinate with the function
 * {@link ngeo.misc.FeatureHelper.prototype.setPointFilterFn}.
 * @param {!ol.Feature} feature Feature.
 * @return {string} Measure.
 * @export
 */
exports.prototype.getMeasure = function(feature) {

  const geometry = feature.getGeometry();
  googAsserts.assert(geometry, 'Geometry should be truthy');

  let measure = '';

  if (geometry instanceof olGeomPolygon) {
    if (this.getType(feature) === ngeoGeometryType.CIRCLE) {
      const azimut = this.optNumber(feature, ngeoFormatFeatureProperties.AZIMUT);
      googAsserts.assertNumber(azimut);
      const line = this.getRadiusLine(feature, azimut);

      measure = ngeoInteractionMeasureAzimut.getFormattedAzimutRadius(
        line, this.projection_, this.decimals_, this.precision_, this.unitPrefixFormat_, this.numberFormat_);
    } else {
      measure = ngeoInteractionMeasure.prototype.getFormattedArea(
        geometry, this.projection_, this.precision_, this.unitPrefixFormat_);
    }
  } else if (geometry instanceof olGeomLineString) {
    measure = ngeoInteractionMeasure.prototype.getFormattedLength(
      geometry, this.projection_, this.precision_, this.unitPrefixFormat_);
  } else if (geometry instanceof olGeomPoint) {
    if (this.pointFilterFn_ === null) {
      measure = ngeoInteractionMeasure.prototype.getFormattedPoint(
        geometry, this.decimals_, this.ngeoNumberCoordinates_);
    } else {
      const coordinates = geometry.getCoordinates();
      const args = this.pointFilterArgs_.slice(0);
      args.unshift(coordinates);
      measure = this.pointFilterFn_(...args);
    }
  }

  return measure;
};


/**
 * Return the type of geometry of a feature using its geometry property and
 * some inner properties.
 * @param {!ol.Feature} feature Feature.
 * @return {string} The type of geometry.
 * @export
 */
exports.prototype.getType = function(feature) {
  const geometry = feature.getGeometry();
  googAsserts.assert(geometry, 'Geometry should be thruthy');

  let type;

  if (geometry instanceof olGeomPoint) {
    if (feature.get(ngeoFormatFeatureProperties.IS_TEXT)) {
      type = ngeoGeometryType.TEXT;
    } else {
      type = ngeoGeometryType.POINT;
    }
  } else if (geometry instanceof olGeomMultiPoint) {
    type = ngeoGeometryType.MULTI_POINT;
  } else if (geometry instanceof olGeomPolygon) {
    if (feature.get(ngeoFormatFeatureProperties.IS_CIRCLE)) {
      type = ngeoGeometryType.CIRCLE;
    } else if (feature.get(ngeoFormatFeatureProperties.IS_RECTANGLE)) {
      type = ngeoGeometryType.RECTANGLE;
    } else {
      type = ngeoGeometryType.POLYGON;
    }
  } else if (geometry instanceof olGeomMultiPolygon) {
    type = ngeoGeometryType.MULTI_POLYGON;
  } else if (geometry instanceof olGeomLineString) {
    type = ngeoGeometryType.LINE_STRING;
  } else if (geometry instanceof olGeomMultiLineString) {
    type = ngeoGeometryType.MULTI_LINE_STRING;
  }

  googAsserts.assert(type, 'Type should be thruthy');

  return type;
};


/**
 * This method first checks if a feature's extent intersects with the map view
 * extent. If it doesn't, then the view gets recentered with an animation to
 * the center of the feature.
 * @param {!ol.Feature} feature Feature.
 * @param {!ol.Map} map Map.
 * @param {number=} opt_panDuration Pan animation duration. Defaults to `250`.
 * @export
 */
exports.prototype.panMapToFeature = function(feature, map,
  opt_panDuration) {

  const panDuration = opt_panDuration !== undefined ? opt_panDuration : 250;
  const size = map.getSize();
  googAsserts.assertArray(size);
  const view = map.getView();
  const extent = view.calculateExtent(size);
  const geometry = feature.getGeometry();

  if (!geometry.intersectsExtent(extent)) {
    const mapCenter = view.getCenter();
    googAsserts.assertArray(mapCenter);

    let featureCenter;
    if (geometry instanceof olGeomLineString) {
      featureCenter = geometry.getCoordinateAt(0.5);
    } else if (geometry instanceof olGeomPolygon) {
      featureCenter = geometry.getInteriorPoint().getCoordinates();
    } else if (geometry instanceof olGeomPoint) {
      featureCenter = geometry.getCoordinates();
    } else {
      featureCenter = olExtent.getCenter(geometry.getExtent());
    }

    view.animate({
      center: mapCenter,
      duration: panDuration
    }, {
      center: featureCenter,
      duration: panDuration
    });
  }
};


/**
 * This method generates a line string geometry that represents the radius for
 * a given azimut. It expects the input geometry to be a circle.
 * @param {!ol.Feature} feature Feature.
 * @param {number} azimut Azimut in degrees.
 * @return {!ol.geom.LineString} The line geometry.
 */
exports.prototype.getRadiusLine = function(feature, azimut) {
  const geometry = feature.getGeometry();
  // Determine the radius for the circle
  const extent = geometry.getExtent();
  const radius = (extent[3] - extent[1]) / 2;

  const center = olExtent.getCenter(geometry.getExtent());

  const x = Math.cos((azimut - 90) * Math.PI / 180) * radius;
  const y = -Math.sin((azimut - 90) * Math.PI / 180) * radius;
  const endPoint = [x + center[0], y + center[1]];
  return new olGeomLineString([center, endPoint]);
};


/**
 * Return the properties of a feature, with the exception of the geometry.
 * @param {!ol.Feature} feature Feature.
 * @return {!Object.<string, *>} Object.
 * @export
 */
exports.prototype.getNonSpatialProperties = function(feature) {
  const geometryName = feature.getGeometryName();
  const nonSpatialProperties = {};
  const properties = feature.getProperties();
  for (const key in properties) {
    if (key !== geometryName) {
      nonSpatialProperties[key] = properties[key];
    }
  }
  return nonSpatialProperties;
};


/**
 * Clear all properties of a feature, with the exception of the geometry.
 * @param {!ol.Feature} feature Feature.
 * @export
 */
exports.prototype.clearNonSpatialProperties = function(feature) {
  const geometryName = feature.getGeometryName();
  const properties = feature.getProperties();
  for (const key in properties) {
    if (key !== geometryName) {
      feature.set(key, undefined);
    }
  }
};


// === FORMAT TYPES ===


/**
 * @enum {string}
 * @export
 */
exports.FormatType = {
  /**
   * @type {string}
   * @export
   */
  GPX: 'GPX',
  /**
   * @type {string}
   * @export
   */
  KML: 'KML'
};


/**
 * @type {!angular.Module}
 */
exports.module = angular.module('ngeoFeatureHelper', [
  ngeoDownloadService.name,
  ngeoMiscFilters.name,
]);
exports.module.service('ngeoFeatureHelper', exports);


export default exports;
