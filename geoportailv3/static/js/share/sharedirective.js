/**
 * @fileoverview This file provides a list of social sharing options.
 * This directive is used
 * to create a sharing panel in the page.
 *
 * Example:
 *
 * <app-share app-share-map="::mainCtrl.map"></app-share>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */
goog.provide('app.shareDirective');

goog.require('app');


/**
 * @param {string} appShareTemplateUrl Url to share template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.shareDirective = function(appShareTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appShareMap'
    },
    controller: 'AppShareController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appShareTemplateUrl
  };
};

app.module.directive('appShare', app.shareDirective);


/**
 * @ngInject
 * @constructor
 * @param {angular.$window} $window
 * @export
 */
app.ShareDirectiveController = function($window) {
  this.services = {
    'facebook': {'url': 'https://www.facebook.com/sharer/sharer.php'},
    'twitter': {'url': 'https://www.twitter.com/intent/tweet'},
    'googlePlus': {'url': 'https://www.plus.google.com/share'}
  };
  this.windowOptions =
    'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600';
  this.window_ = $window;
};

/**
 * @export
 * @param {string} service Sharing Service Url.
 * @return {boolean}
 */
app.ShareDirectiveController.prototype.openShareLink = function(service) {
  var serviceUrl = goog.object.containsKey(this.services, service) ?
    this.services[service].url : false;
  if (serviceUrl) {
    var popup =
      this.window_.open(serviceUrl, '_blank', this.windowOptions);
    popup.focus();
  }
  return false;
};

/**
 * @export
 * @return {boolean}
 */
app.ShareDirectiveController.prototype.openMailLink = function() {
return false;
};

app.module.controller('AppShareController', app.ShareDirectiveController);
