/**
 * @module app.GPX
 */
/**
 * @fileoverview This file provides the "app.GPX" class.
 * it extends "ol.format.GPX" to support metadata name in GPX.
 */
import appModule from './module.js';
import olFormatGPX from 'ol/format/GPX.js';
import {writeStringTextNode} from 'ol/format/xsd.js';
import {
  createElementNS,
} from 'ol/xml.js';
const exports = class extends olFormatGPX {
  /**
   * Encode an array of features in the GPX format as an XML node.
   * LineString geometries are output as routes (`<rte>`), and MultiLineString
   * as tracks (`<trk>`).
   *
   * @param {Array<Feature>} features Features.
   * @param {import("ol/format/Feature.js").WriteOptions} [opt_options] Options.
   * @return {Node} Node.
   * @api
   */
  writeFeaturesNode(features, opt_options) {
    var xml = super.writeFeaturesNode(features, opt_options);
    if ('metadata' in opt_options && 'name' in opt_options['metadata']) {
      const GPXNS = 'http://www.topografix.com/GPX/1/1';
      const metadataEle = createElementNS(GPXNS, 'metadata');
      const nameEle = createElementNS(GPXNS, 'name');
      writeStringTextNode(nameEle, opt_options['metadata']['name']);
      metadataEle.appendChild(nameEle);
      if (xml.childNodes.length > 0) {
        xml.insertBefore(metadataEle, xml.childNodes[0]);
      } else {
        xml.appendChild(metadataEle);
      }
    }
    return xml;
  }
}

appModule.service('appGPX', exports);

export default exports;