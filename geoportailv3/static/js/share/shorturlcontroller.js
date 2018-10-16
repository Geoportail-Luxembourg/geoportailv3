/**
 * @fileoverview This file provides a shorturl directive
 * This directive is used to create a short url panel in the page.
 *
 * Example:
 *
 * <app-shorturl app-shorturl-active="::mainCtrl.active"></app-shorturl>
 *
 */
goog.provide('app.share.ShorturlController');

goog.require('app.module');


/**
 * @ngInject
 * @constructor
 * @param {angular.Scope} $scope The scope.
 * @param {ngeo.statemanager.Location} ngeoLocation The location service.
 * @param {app.GetShorturl} appGetShorturl The short url service.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @export
 */
app.share.ShorturlController = function($scope, ngeoLocation,
    appGetShorturl, appMymaps) {
  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

  /**
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

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
      $scope.$on('ngeoLocationChange', function(event) {
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
app.share.ShorturlController.prototype.setUrl_ =
    function() {
      this.url = this.ngeoLocation_.getUriString();
      if (this['onlyMymaps']) {
        this.url += location.search ? '&' : '?';
        this.url += 'map_id=' + this.appMymaps_.getMapId();
      }
      this.longurl = this.url;
      this.getShorturl_().then(
      /**
       * @param {string} shorturl The short URL.
       */
      function(shorturl) {
        this.url = shorturl;
      }.bind(this));
    };


/**
 * @return {boolean} true if a mymaps is selected
 * @export
 */
app.share.ShorturlController.prototype.isMymapsSelected =
    function() {
      if (this.appMymaps_.getMapId()) {
        return true;
      }
      return false;
    };

app.module.controller('AppShorturlController', app.share.ShorturlController);
