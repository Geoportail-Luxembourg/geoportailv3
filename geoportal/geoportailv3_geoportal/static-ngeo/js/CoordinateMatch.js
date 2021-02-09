import olGeomPoint from 'ol/geom/Point.js';
import {containsCoordinate} from 'ol/extent.js';
import {transform} from 'ol/proj.js';
import {includes as arrayIncludes} from 'ol/array.js';
import olFeature from 'ol/Feature.js';


/**
 * @param {string} searchString The search string.
 * @param {string} mapEpsgCode The search string.
 * @param {Array.<number>} maxExtent Constraining extent.
 * @param {app.CoordinateString} coordinateString
 * @return {Array<ol.Feature>} The result.
 */
export function matchCoordinate(searchString, mapEpsgCode, maxExtent, coordinateString) {
  searchString = searchString.replace(/,/gi, '.');
  var results = [];
  var re = {
    'EPSG:32631': {
      regex: /(\d{6,6}[\,\.]?\d{0,3})\s*?\W*(\d{7,7}[\,\.]?\d{0,3})\s*?/,
      label: 'UTM31N',
      epsgCode: 'EPSG:32631'
    },
    'EPSG:32632': {
      regex: /(\d{6,6}[\,\.]?\d{0,3})\s*?\W*(\d{7,7}[\,\.]?\d{0,3})\s*?/,
      label: 'UTM32N',
      epsgCode: 'EPSG:32632'
    },
    'EPSG:2169': {
      regex: /(\d{4,6}[\,\.]?\d{0,3})\s*([E|N])?\W*(\d{4,6}[\,\.]?\d{0,3})\s*([E|N])?/,
      label: 'LUREF',
      epsgCode: 'EPSG:2169'
    },
    'EPSG:2169:V2': {
      regex: /(\d{4,6})\s*([E|N])?[\,\.]\s*(\d{4,6})\s*([E|N])?/,
      label: 'LUREF',
      epsgCode: 'EPSG:2169'
    },
    'EPSG:4326': {
      regex:
      /(\d{1,2}[\,\.]\d{1,6})\d*\s?(latitude|lat|N|longitude|long|lon|E|east|est)?\W*(\d{1,2}[\,\.]\d{1,6})\d*\s?(longitude|long|lon|E|latitude|lat|N|north|nord)?/i,
      label: 'long/lat WGS84',
      epsgCode: 'EPSG:4326'
    },
    'EPSG:4326:DMS': {
      regex:
      /([NSEW])?(-)?(\d+(?:\.\d+)?)[°º:d\s]?\s?(?:(\d+(?:\.\d+)?)['’‘′:]\s?(?:(\d{1,2}(?:\.\d+)?)(?:"|″|’’|'')?)?)?\s?([NSEW])?/i,
      label: 'long/lat WGS84 DMS',
      epsgCode: 'EPSG:4326'
    }
  };
  var northArray = ['LATITUDE', 'LAT', 'N', 'NORTH', 'NORD'];
  var eastArray = ['LONGITUDE', 'LONG', 'LON', 'E', 'EAST', 'EST'];
  for (var epsgKey in re) {
    /**
     * @type {Array.<string | undefined>}
     */
    var m = re[epsgKey].regex.exec(searchString);
    if (epsgKey === 'EPSG:2169' && (searchString.match(/\./g) || []).length == 1) {
      m = undefined;
    }
    if (m !== undefined && m !== null) {
      var epsgCode = re[epsgKey].epsgCode;
      var isDms = false;
      /**
       * @type {number | undefined}
       */
      var easting = undefined;
      /**
       * @type {number | undefined}
       */
      var northing = undefined;
      if (epsgCode === 'EPSG:32631' || epsgCode === 'EPSG:32632') {
        if ((m[1] !== undefined && m[1] !== null) && (m[2] !== undefined && m[2] !== null)) {
          var coordinate = [parseFloat(m[1].replace(',', '.')), parseFloat(m[2].replace(',', '.'))];
          var lonlat = /** @type {ol.Coordinate} */
          (transform(coordinate, epsgCode, 'EPSG:4326'));
          if (Math.floor(lonlat[0]) === 5 || Math.floor(lonlat[0]) === 6) {
            easting = parseFloat(m[1].replace(',', '.'));
            northing = parseFloat(m[2].replace(',', '.'));
          }
        }
      } else if (epsgKey === 'EPSG:4326' || epsgKey === 'EPSG:2169' || epsgKey === 'EPSG:2169:V2') {
        if ((m[2] !== undefined && m[2] !== null) && (m[4] !== undefined && m[4] !== null)) {
          if (arrayIncludes(northArray, m[2].toUpperCase()) &&
          arrayIncludes(eastArray, m[4].toUpperCase())) {
            easting = parseFloat(m[3].replace(',', '.'));
            northing = parseFloat(m[1].replace(',', '.'));
          } else if (arrayIncludes(northArray, m[4].toUpperCase()) &&
          arrayIncludes(eastArray, m[2].toUpperCase())) {
            easting = parseFloat(m[1].replace(',', '.'));
            northing = parseFloat(m[3].replace(',', '.'));
          }
        } else if (m[2] === undefined && m[4] === undefined) {
          easting = parseFloat(m[1].replace(',', '.'));
          northing = parseFloat(m[3].replace(',', '.'));
        }
      } else if (epsgKey === 'EPSG:4326:DMS') {
        // Inspired by https://github.com/gmaclennan/parse-dms/blob/master/index.js
        var m1, m2, decDeg1, decDeg2, dmsString2;
        m1 = m;
        if (m1[1]) {
          m1[6] = undefined;
          dmsString2 = searchString.substr(m1[0].length - 1).trim();
        } else {
          dmsString2 = searchString.substr(m1[0].length).trim();
        }
        decDeg1 = decDegFromMatch_(m1);
        if (decDeg1 !== undefined) {
          m2 = re[epsgKey].regex.exec(dmsString2);
          decDeg2 = m2 ? decDegFromMatch_(m2) : undefined;
          if (decDeg2 !== undefined) {
            if (typeof decDeg1.latLon === 'undefined') {
              if (!isNaN(decDeg1.decDeg) && !isNaN(decDeg2.decDeg)) {
                // If no hemisphere letter but we have two coordinates,
                // infer that the first is lat, the second lon
                decDeg1.latLon = 'lat';
              }
            }
            if (decDeg1.latLon === 'lat') {
              northing = decDeg1.decDeg;
              easting = decDeg2.decDeg;
            } else {
              easting = decDeg1.decDeg;
              northing = decDeg2.decDeg;
            }
            isDms = true;
          }
        }
      }
      if (easting !== undefined && northing !== undefined) {
        var point = /** @type {ol.geom.Point} */
        (new olGeomPoint([easting, northing])
       .transform(epsgCode, mapEpsgCode));
        var flippedPoint =  /** @type {ol.geom.Point} */
        (new olGeomPoint([northing, easting])
       .transform(epsgCode, mapEpsgCode));
        var feature = /** @type {ol.Feature} */ (null);
        if (containsCoordinate(maxExtent, point.getCoordinates())) {
          feature = new olFeature(point);
        } else if (epsgCode === 'EPSG:4326' && containsCoordinate(
        maxExtent, flippedPoint.getCoordinates())) {
          feature = new olFeature(flippedPoint);
        }
        if (feature !== null) {
          var resultPoint = /** @type {ol.geom.Point} */ (feature.getGeometry());
          var resultString = coordinateString(
            resultPoint.getCoordinates(), mapEpsgCode, epsgCode, isDms, false
          );
          feature.set('label', resultString);
          feature.set('epsgLabel', re[epsgKey].label);
          results.push(feature);
        }
      }
    }
  }
  return results; //return empty array if no match
};

/**
 * @param {Array.<string | undefined>} m The matched result.
 * @return {Object | undefined} Returns the coordinate.
 */
const decDegFromMatch_ = function(m) {
  var signIndex = {
    '-': -1,
    'N': 1,
    'S': -1,
    'E': 1,
    'W': -1
  };

  var latLonIndex = {
    'N': 'lat',
    'S': 'lat',
    'E': 'lon',
    'W': 'lon'
  };

  var sign;
  sign = signIndex[m[2]] || signIndex[m[1]] || signIndex[m[6]] || 1;
  if (m[3] === undefined) {
    return undefined;
  }

  var degrees, minutes = 0, seconds = 0, latLon;
  degrees = Number(m[3]);
  if (m[4] !== undefined) {
    minutes = Number(m[4]);
  }
  if (m[5] !== undefined) {
    seconds = Number(m[5]);
  }
  latLon = latLonIndex[m[1]] || latLonIndex[m[6]];

  return {
    decDeg: sign * (degrees + minutes / 60 + seconds / 3600),
    latLon: latLon
  };
};
