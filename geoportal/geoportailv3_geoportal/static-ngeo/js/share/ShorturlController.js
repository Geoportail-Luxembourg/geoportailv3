/**
 * @module app.share.ShorturlController
 */
/**
 * @fileoverview This file provides a shorturl directive
 * This directive is used to create a short url panel in the page.
 *
 * Example:
 *
 * <app-shorturl app-shorturl-active="::mainCtrl.active"></app-shorturl>
 *
 */

import appModule from '../module.js';
import { urlStorage } from "luxembourg-geoportail/bundle/lux.dist.js";

/**
 * @ngInject
 * @constructor
 * @param {angular.Scope} $scope The scope.
 * @param {ngeo.statemanager.Location} ngeoLocation The location service.
 * @param {app.GetShorturl} appGetShorturl The short url service.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @export
 */
const exports = function($scope, appGetShorturl, appMymaps) {
  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;



  /**
   * @type {string}
   * @export
   */
  this.url = '';

  /**
   * @type {string}
   * @export
   */
  this.longurl = '';

  /**
   * @type {app.GetShorturl}
   * @private
   */
  this.getShorturl_ = appGetShorturl;

  $scope.$watch(function() {
    return this['active'];
  }.bind(this), function(newVal) {
    if (newVal === true) {
      this.setUrl_();
      this.removeListener =
      $scope.$watch(function() { 
        return (urlStorage.getStrippedUrl());
      }.bind(this), function() {
        this.setUrl_();
      }.bind(this));
    } else if (newVal === false && this.removeListener) {
      this.removeListener();
    }
  }.bind(this));

  $scope.$watch(function() {
    return this['active'] && this['onlyMymaps'];
  }.bind(this), function(newVal) {
    this.setUrl_();
  }.bind(this));
};


/**
 * @private
 */
exports.prototype.setUrl_ =
    function() {
      this.url = urlStorage.getStrippedUrl();
      if (this['onlyMymaps']) {
        this.url = this.url.replace(location.search, '')
        this.url += '?map_id=' + this.appMymaps_.getMapId();
      }
      this.longurl = this.url;
      this.getShorturl_().then(
      /**
       * @param {string} shorturl The short URL.
       */
      (function(shorturl) {
        this.url = shorturl.short_url;
      }).bind(this));
    };


/**
 * @return {boolean} true if a mymaps is selected
 * @export
 */
exports.prototype.isMymapsSelected =
    function() {
      if (this.appMymaps_.getMapId()) {
        return true;
      }
      return false;
    };

appModule.controller('AppShorturlController', exports);


export default exports;
