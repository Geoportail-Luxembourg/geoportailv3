/**
 * @fileoverview This file provides a shorturl directive
 * This directive is used to create a short url panel in the page.
 *
 * Example:
 *
 * <app-shorturl app-shorturl-active="::mainCtrl.active"></app-shorturl>
 *
 */
goog.provide('app.ShorturlDirectiveController');
goog.provide('app.shorturlDirective');

goog.require('app');
goog.require('app.GetShorturl');
goog.require('ngeo.Location');


/**
 * @param {string} appShorturlTemplateUrl Url to share template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.shorturlDirective = function(appShorturlTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'active': '=appShorturlActive'
    },
    controller: 'AppShorturlController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appShorturlTemplateUrl
  };
};

app.module.directive('appShorturl', app.shorturlDirective);



/**
 * @ngInject
 * @constructor
 * @param {angular.Scope} $scope
 * @param {ngeo.Location} ngeoLocation
 * @param {app.GetShorturl} appGetShorturl
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @export
 */
app.ShorturlDirectiveController =
    function($scope, ngeoLocation, appGetShorturl, appMymaps) {
  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

  /**
   * @type {ngeo.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  /**
   * @type {string}
   */
  this['url'] = '';

  /**
   * @type {app.GetShorturl}
   * @private
   */
  this.getShorturl_ = appGetShorturl;

  /**
   * @type {boolean}
   * @export
   */
  this.onlyMymaps = false;

  $scope.$watch(goog.bind(function() {
    return this['active'];
  }, this), goog.bind(function(newVal) {
    if (newVal === true) {
      this.setUrl_();
      this.removeListener =
          $scope.$on('ngeoLocationChange', goog.bind(function(event) {
        this.setUrl_();
      }, this));
    } else if (newVal === false && this.removeListener) {
      this.removeListener();
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this['active'] && this.onlyMymaps;
  }, this), goog.bind(function(newVal) {
    this.setUrl_();
  }, this));
};


/**
 * @private
 */
app.ShorturlDirectiveController.prototype.setUrl_ =
    function() {
  if (this.onlyMymaps) {
    var uri = this.ngeoLocation_.getUri().clone();
    this['url'] = uri.setQueryData('map_id=' + this.appMymaps_.getMapId(),
        true).toString();
  } else {
    this['url'] = this.ngeoLocation_.getUriString();
  }

  this.getShorturl_().then(goog.bind(
      /**
       * @param {string} shorturl The short URL.
       */
      function(shorturl) {
        this['url'] = shorturl;
      }, this));
};


/**
 * @return {boolean} true if a mymaps is selected
 * @export
 */
app.ShorturlDirectiveController.prototype.isMymapsSelected =
    function() {
  if (this.appMymaps_.getMapId()) return true;
  return false;
};

app.module.controller('AppShorturlController', app.ShorturlDirectiveController);
