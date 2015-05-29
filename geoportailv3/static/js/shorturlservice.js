/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "shorturl" web service.
 */
goog.provide('app.GetShorturl');

goog.require('app');


/**
 * @typedef {function(ol.Coordinate=):!angular.$q.Promise}
 */
app.GetShorturl;


/**
 * @param {angular.$http} $http The Angular $http service.
 * @param {ngeo.Location} ngeoLocation The ngeo Location service.
 * @param {string} shorturlServiceUrl The URL to the "shorturl" service.
 * @return {app.GetShorturl} The getShorturl function.
 * @private
 * @ngInject
 */
app.getShorturl_ = function($http, ngeoLocation, shorturlServiceUrl) {
  return (
     /**
     * @param {ol.Coordinate=} coordinate
     * @return {!angular.$q.Promise} Promise providing the short URL.
     */
      function getShorturl(coordinate) {
        var location = ngeoLocation;
        if (coordinate) {
          location.updateParams({
            'x': coordinate[0],
            'y': coordinate[1]
          });
        }
        var url = location.getUriString();
        return $http.get(shorturlServiceUrl, {
          params: {
            'url': url
          }
        }).then(
            /**
         * @param {angular.$http.Response} resp Ajax response.
         * @return {string} The short URL.
         */
            function(resp) {
              return resp.data['short_url'];
            });
      });
};


app.module.service('appGetShorturl', app.getShorturl_);
