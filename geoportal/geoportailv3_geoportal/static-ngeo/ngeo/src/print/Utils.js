/**
 * @module ngeo.print.Utils
 */
import * as olHas from 'ol/has.js';
import * as olMath from 'ol/math.js';

/**
 * Provides a service with print utility functions.
 *
 * @constructor
 * @struct
 * @ngdoc service
 * @ngname ngeoPrintUtils
 */
const exports = function() {

  /**
   * @type {number}
   * @private
   */
  this.extentHalfHorizontalDistance_;

  /**
   * @type {number}
   * @private
   */
  this.extentHalfVerticalDistance_;

};


/**
 * @const
 * @private
 */
exports.INCHES_PER_METER_ = 39.37;


/**
 * @const
 * @private
 */
exports.DOTS_PER_INCH_ = 72;


/**
 * Get the optimal print scale for a map, the map being defined by its
 * size (in pixels) and resolution (in map units per pixel).
 * @param {ol.Size} mapSize Size of the map on the screen (px).
 * @param {number} mapResolution Resolution of the map on the screen.
 * @param {ol.Size} printMapSize Size of the map on the paper (dots).
 * @param {Array.<number>} printMapScales Supported map scales on the paper.
 * The scales are provided as scale denominators, sorted in ascending order.
 * E.g. `[500, 1000, 2000, 4000]`.
 * @return {number} The best scale. `-1` is returned if there is no optimal
 * scale, that is the optimal scale is lower than or equal to the first value
 * in `printMapScales`.
 * @export
 */
exports.prototype.getOptimalScale = function(
  mapSize, mapResolution, printMapSize, printMapScales) {

  const mapWidth = mapSize[0] * mapResolution;
  const mapHeight = mapSize[1] * mapResolution;

  const scaleWidth = mapWidth * exports.INCHES_PER_METER_ *
      exports.DOTS_PER_INCH_ / printMapSize[0];
  const scaleHeight = mapHeight * exports.INCHES_PER_METER_ *
      exports.DOTS_PER_INCH_ / printMapSize[1];

  const scale = Math.min(scaleWidth, scaleHeight);

  let optimal = -1;
  for (let i = 0, ii = printMapScales.length; i < ii; ++i) {
    if (scale > printMapScales[i]) {
      optimal = printMapScales[i];
    }
  }

  return optimal;
};


/**
 * Get the optimal map resolution for a print scale and a map size.
 * @param {ol.Size} mapSize Size of the map on the screen (px).
 * @param {ol.Size} printMapSize Size of the map on the paper (dots).
 * @param {number} printMapScale Map scale on the paper.
 * @return {number} The optimal map resolution.
 * @export
 */
exports.prototype.getOptimalResolution = function(
  mapSize, printMapSize, printMapScale) {

  const dotsPerMeter =
      exports.DOTS_PER_INCH_ * exports.INCHES_PER_METER_;

  const resolutionX = (printMapSize[0] * printMapScale) /
      (dotsPerMeter * mapSize[0]);
  const resolutionY = (printMapSize[1] * printMapScale) /
      (dotsPerMeter * mapSize[1]);

  const optimalResolution = Math.max(resolutionX, resolutionY);

  return optimalResolution;
};


/**
 * Get the coordinates of the bottom left corner of the printed map.
 * @param {ol.Coordinate} mapCenter Center of the map to print.
 * @return {ol.Coordinate} The coordinates of the bottom left corner.
 */
exports.prototype.getBottomLeftCorner = function(mapCenter) {
  return [mapCenter[0] - this.extentHalfHorizontalDistance_,
    mapCenter[1] - this.extentHalfVerticalDistance_];
};


/**
 * Get the coordinates of the bottom right corner of the printed map.
 * @param {ol.Coordinate} mapCenter Center of the map to print.ç
 * @return {ol.Coordinate} The coordinates of the bottom right corner.
 */
exports.prototype.getBottomRightCorner = function(mapCenter) {
  return [mapCenter[0] + this.extentHalfHorizontalDistance_,
    mapCenter[1] - this.extentHalfVerticalDistance_];
};


/**
 * Get the coordinates of the up left corner of the printed map.
 * @param {ol.Coordinate} mapCenter Center of the map to print.
 * @return {ol.Coordinate} The coordinates of the up left corner.
 */
exports.prototype.getUpLeftCorner = function(mapCenter) {
  return [mapCenter[0] - this.extentHalfHorizontalDistance_,
    mapCenter[1] + this.extentHalfVerticalDistance_];
};


/**
 * Get the coordinates of the up right corner of the printed map.
 * @param {ol.Coordinate} mapCenter Center of the map to print.
 * @return {ol.Coordinate} The coordinates of the up right corner.
 */
exports.prototype.getUpRightCorner = function(mapCenter) {
  return [mapCenter[0] + this.extentHalfHorizontalDistance_,
    mapCenter[1] + this.extentHalfVerticalDistance_];
};

/**
 * @type {!angular.Module}
 */
exports.module = angular.module('ngeoPrintUtils', []);
exports.module.service('ngeoPrintUtils', exports);


export default exports;
