/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "shorturl" web service.
 */
goog.module('app.GetShorturlService');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


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
       * @param {ol.Coordinate=} opt_coordinate
       * @return {!angular.$q.Promise} Promise providing the short URL.
       */
      function getShorturl(opt_coordinate) {
        if (opt_coordinate !== undefined) {
          ngeoLocation.updateParams({
            'X': Math.round(opt_coordinate[0]),
            'Y': Math.round(opt_coordinate[1])
          });
        }
        var req = $.param({
          'url': ngeoLocation.getUriString()
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
