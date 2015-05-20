
/**
 * @fileoverview This file provides a shorturl directive
 * This directive is used to create a short url panel in the page.
 *
 * Example:
 *
 * <app-shorturl app-shorturl-active="::mainCtrl.active"></app-shorturl>
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
 * @param {ngeo.Location} ngeoLocation
 * @param {angular.$http} $http
 * @param {angular.Scope} $scope
 * @param {string} shorturlServiceUrl
 * @export
 */
app.ShorturlDirectiveController =
    function(ngeoLocation, $http, $scope, shorturlServiceUrl) {
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
   * @type {string}
   * @private
   */
  this.serviceUrl_ = shorturlServiceUrl;

  /**
   * @type {angular.$http} $http
   * @private
   */
  this.http_ = $http;

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
  this.http_.get(this.serviceUrl_, {
    params: {
      'url': this['url']
    }
  }).success(goog.bind(function(data) {
    this['url'] = data['short_url'];
  }, this));
};

app.module.controller('AppShorturlController', app.ShorturlDirectiveController);
