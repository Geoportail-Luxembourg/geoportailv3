// The MIT License (MIT)
//
// Copyright (c) 2016-2020 Camptocamp SA
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import {noModifierKeys, singleClick} from 'ol/events/condition.js';
import olGeomLineString from 'ol/geom/LineString.js';
import olGeomMultiPoint from 'ol/geom/MultiPoint.js';
import olGeomMultiLineString from 'ol/geom/MultiLineString.js';
import olGeomMultiPolygon from 'ol/geom/MultiPolygon.js';
import olGeomPoint from 'ol/geom/Point.js';
import olGeomPolygon from 'ol/geom/Polygon.js';
import {getTopLeft, getTopRight, getBottomLeft, getBottomRight} from 'ol/extent.js';
import {MAC} from 'ol/has.js';

/**
 * Return whether the passed event has the 'ctrl' key (or 'meta' key on Mac) pressed or not.
 * @param {Event|import("ol/events/Event.js").default} evt Event.
 * @return {boolean}
 */
export function isEventUsinCtrlKey(evt) {
  if (!evt) {
    return false;
  }
  // Do not use evt.ctrlKey (or evt.metaKey on Mac) Because Firefox sometimes doesn't assign the ctrlKey.
  return MAC ? evt.key === 'Meta' : evt.key === 'Control';
}

/**
 * Same as `ol.events.condition.platformModifierKeyOnly` but for JQueryEventObject.
 * @param {JQueryEventObject} event Event.
 * @return {boolean} True if only the platform modifier key (ctrl) is pressed.
 * @private
 */
export function isPlatformModifierKeyOnly(evt) {
  return !evt.altKey && isEventUsinCtrlKey(evt) && !evt.shiftKey;
}

/**
 * Same as `ol.events.condition.shiftKeyOnly` but for JQueryEventObject.
 * @param {JQueryEventObject} event Event.
 * @return {boolean} True if only the shift key is pressed.
 * @private
 */
export function isShiftKeyOnly(evt) {
  return !evt.altKey && !isEventUsinCtrlKey(evt) && evt.shiftKey;
}

/**
 * Return whether the primary pointing device is coarse or 'false' if unsupported (Internet Explorer).
 * See https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer
 * @return {boolean}
 */
export function hasCoarsePointingDevice() {
  return matchMedia('(pointer: coarse)').matches;
}

/**
 * @param {string[]} availableLanguages Available languages.
 * @return {string} The "best" language code.
 */
export function getBrowserLanguage(availableLanguages) {
  let browserLanguages = window.navigator.languages || [window.navigator.language];
  browserLanguages = browserLanguages.map((item) => item.substring(0, 2));
  // remove duplicated language codes
  browserLanguages = browserLanguages.filter((item, index, arr) => arr.indexOf(item) == index);
  const supportedLanguages = browserLanguages.filter((item) => availableLanguages.includes(item));
  return supportedLanguages[0];
}

/**
 * Utility method that converts a simple geometry to its multi equivalent. If
 * the geometry itself is already multi, it is returned as-is.
 * @param {import("ol/geom/Geometry.js").default} geometry A geometry
 * @return {import("ol/geom/Geometry.js").default} A multi geometry
 * @hidden
 */
export function toMulti(geometry) {
  /** @type {import("ol/geom/Geometry.js").default} */
  let multiGeom;
  if (geometry instanceof olGeomPoint) {
    const multiGeomPoint = new olGeomMultiPoint([]);
    multiGeomPoint.appendPoint(geometry);
    multiGeom = multiGeomPoint;
  } else if (geometry instanceof olGeomLineString) {
    const multiGeomLine = new olGeomMultiLineString([]);
    multiGeomLine.appendLineString(geometry);
    multiGeom = multiGeomLine;
  } else if (geometry instanceof olGeomPolygon) {
    const multiGeomPolygon = new olGeomMultiPolygon([]);
    multiGeomPolygon.appendPolygon(geometry);
    multiGeom = multiGeomPolygon;
  } else {
    multiGeom = geometry;
  }
  return multiGeom;
}

/**
 * Checks if on Safari.
 * @return {boolean} True if on Safari.
 * @hidden
 */
export function isSafari() {
  return navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
}

/**
 * Takes a hex value and prepends a zero if it's a single digit.
 * @param {string} hex Hex value to prepend if single digit.
 * @return {string} hex value prepended with zero if it was single digit,
 *     otherwise the same value that was passed in.
 * @hidden
 */
export function colorZeroPadding(hex) {
  return hex.length == 1 ? `0${hex}` : hex;
}

/**
 * Converts a color from RGB to hex representation.
 * @param {number[]} rgb rgb representation of the color.
 * @return {string} hex representation of the color.
 * @hidden
 */
export function rgbArrayToHex(rgb) {
  const r = rgb[0];
  const g = rgb[1];
  const b = rgb[2];
  if (r != (r & 255) || g != (g & 255) || b != (b & 255)) {
    throw Error(`"(${r},${g},${b})" is not a valid RGB color`);
  }
  const hexR = colorZeroPadding(r.toString(16));
  const hexG = colorZeroPadding(g.toString(16));
  const hexB = colorZeroPadding(b.toString(16));
  return `#${hexR}${hexG}${hexB}`;
}

/**
 * Decode the encoded query string into a query data dictionary.
 * @param {string|undefined} queryString The queryString.
 * @return {Object<string, string>} The result.
 * @hidden
 */
export function decodeQueryString(queryString) {
  /** @type {Object<string, string>} */
  const queryData = {};
  if (queryString) {
    const pairs = queryString.substring(1).split('&');
    for (const pair of pairs) {
      const indexOfEquals = pair.indexOf('=');
      if (indexOfEquals >= 0) {
        const name = pair.substring(0, indexOfEquals);
        const value = pair.substring(indexOfEquals + 1);
        try {
          queryData[decodeURIComponent(name)] = decodeURIComponent(value);
        } catch (error) {
          // ignore URIError exception from decodeURIComponent
          console.error(`Malformed parameter: ${name}=${value}`);
        }
      } else {
        queryData[pair] = '';
      }
    }
  }
  return queryData;
}

/**
 * Encode the query data dictionary into an encoded query string.
 * @param {Object<string, string>} queryData The queryData,
 * @return {string} The result.
 * @hidden
 */
export function encodeQueryString(queryData) {
  const queryItem = [];
  for (const key in queryData) {
    const value = queryData[key];
    queryItem.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  return queryItem.join('&');
}

/**
 * Delete condition passed to the modify interaction
 * @param {import("ol/MapBrowserEvent.js").default} event Browser event.
 * @return {boolean} The result.
 * @hidden
 */
export function deleteCondition(event) {
  return noModifierKeys(event) && singleClick(event);
}

/**
 * Takes an import("ol/extent.js").Extent and return an Array of
 * ol.Coordinate representing a rectangle polygon.
 * @param {import("ol/extent.js").Extent} extent The extent.
 * @return {Array.<import("ol/coordinate.js").Coordinate>} The Array of coordinate of the rectangle.
 */
export function extentToRectangle(extent) {
  const result = [
    getTopLeft(extent),
    getTopRight(extent),
    getBottomRight(extent),
    getBottomLeft(extent),
    getTopLeft(extent),
  ];
  return result;
}
