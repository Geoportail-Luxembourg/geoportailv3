/**
 * @module app.GetShorturlService
 */
let exports = {};

/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "shorturl" web service.
 */
import { urlStorage } from "luxembourg-geoportail/bundle/lux.dist.js";
import appModule from './module.js';


/**
 * @return {app.GetShorturl} The getShorturl function.
 * @private
 * @ngInject
 */
function service() {
  return (
      /**
       * @param {ol.Coordinate=} optCoordinate coordinates.
       * @return {!angular.$q.Promise} Promise providing the short URL.
       */
      function getShorturl(optCoordinate) {
        if (optCoordinate !== undefined) {
          urlStorage.setItem('X', Math.round(optCoordinate[0]))
          urlStorage.setItem('Y', Math.round(optCoordinate[1]))
        }
        const shortUrl = (urlStorage.getShortUrl(optCoordinate))
        return shortUrl;
      });
}


appModule.service('appGetShorturl', service);


export default exports;
