/**
 * @module app.GetShorturlService
 */
let exports = {};

/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "shorturl" web service.
 */

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
       * @param {ol.Coordinate=} opt_coordinate coordinates.
       * @return {!angular.$q.Promise} Promise providing the short URL.
       */
      function getShorturl(opt_coordinate) {
        if (opt_coordinate !== undefined) {
          ngeoLocation.updateParams({
            'X': Math.round(opt_coordinate[0]),
            'Y': Math.round(opt_coordinate[1])
          });
        }
        var url = ngeoLocation.getUriString();
        //Replace the specific app parameter
        var isApp =
        location.search.includes('localforage=android') ||
        location.search.includes('localforage=ios') ||
        location.search.includes('applogin=yes');

        if (isApp) {
            url = url.replace('localforage=android', '')
            url = url.replace('localforage=ios', '')
            url = url.replace('applogin=yes', '')
        }
        var req = $.param({
          'url': url
        });
        var config = {
          headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        };
        return $http.post(shorturlServiceUrl, req, config).then(
            /**
           * @param {angular.$http.Response} resp Ajax response.
           * @return {string} The short URL.
           */
            function(resp) {
              return resp.data['short_url'];
            });
      });
}


appModule.service('appGetShorturl', service);


export default exports;
