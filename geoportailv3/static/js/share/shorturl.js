
/**
 * @fileoverview This file provides a shorturl directive
 * This directive is used to create a short url panel in the page.
 *
 * Example:
 *
 * <app-shorturl app-shorturl-visible="::mainCtrl.visible"></app-shorturl>
 *
 */
goog.provide('app.shorturlDirective');

goog.require('app');
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
      'visible': '=appShorturlVisible'
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
 * @param {ngeo.Location} ngeoLocation
 * @param {angular.$http} $http
 * @param {angular.Scope} $rootScope
 * @param {string} shorturlServiceUrl
 * @export
 */
app.ShorturlDirectiveController =
    function(ngeoLocation, $http, $rootScope, shorturlServiceUrl) {
  /**
   * @type {ngeo.Location}
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
   * @private
   */
  this.serviceUrl_ = shorturlServiceUrl;

  /**
   * @type {angular.$http} $http
   * @private
   */
  this.http_ = $http;

  $rootScope.$watch(goog.bind(function() {
    return this['visible'];
  }, this), goog.bind(function(newVal) {
    if (newVal === true) {
      this.setUrl();
      this.removeListener =
          $rootScope.$on('ngeoLocationChange', goog.bind(function(event) {
        this.setUrl();
      }, this));
    } else if (newVal === false && this.removeListener) {
      this.removeListener();
    }
  }, this));
};


/**
 * @export
 */
app.ShorturlDirectiveController.prototype.setUrl =
    function() {
  this.url = this.ngeoLocation_.getUriString();
  this.http_.get(this.serviceUrl_, {
    params: {
      'url': this.url
    }
  }).success(goog.bind(function(data) {
    this.url = data['short_url'];
  }, this));
};

app.module.controller('AppShorturlController', app.ShorturlDirectiveController);
