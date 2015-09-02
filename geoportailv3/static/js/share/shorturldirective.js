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
 * @export
 */
app.ShorturlDirectiveController =
    function($scope, ngeoLocation, appGetShorturl) {
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
};


/**
 * @private
 */
app.ShorturlDirectiveController.prototype.setUrl_ =
    function() {
  this['url'] = this.ngeoLocation_.getUriString();
  this.getShorturl_().then(goog.bind(
      /**
       * @param {string} shorturl The short URL.
       */
      function(shorturl) {
        this['url'] = shorturl;
      }, this));
};

app.module.controller('AppShorturlController', app.ShorturlDirectiveController);
