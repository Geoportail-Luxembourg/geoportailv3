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
 * @param {angular.$http} $http The Angular $http service.
 * @param {ngeo.statemanager.Location} ngeoLocation The ngeo Location service.
 * @param {string} shorturlServiceUrl The URL to the "shorturl" service.
 * @return {app.GetShorturl} The getShorturl function.
 * @private
 * @ngInject
 */
function service($http, ngeoLocation, shorturlServiceUrl) {
  return (
      /**
       * @param {ol.Coordinate=} optCoordinate coordinates.
       * @return {!angular.$q.Promise} Promise providing the short URL.
       */
      function getShorturl(optCoordinate) {
        const shortUrl = (urlStorage.getShortUrl(optCoordinate))
        return shortUrl;
      });
}


appModule.service('appGetShorturl', service);


export default exports;
