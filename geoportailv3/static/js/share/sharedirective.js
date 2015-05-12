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
goog.require('goog.Uri');


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
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @export
 */
app.ShareDirectiveController = function($window, gettextCatalog) {
  /**
   * @type {Object}
   */
  this.services = {
    'facebook': {'url': 'https://www.facebook.com/sharer/sharer.php'},
    'twitter': {'url': 'https://www.twitter.com/intent/tweet'},
    'googlePlus': {'url': 'https://plus.google.com/share'}
  };
  /**
   * @type {string}
   */
  this.windowOptions =
    'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600';
  /**
   * @type {angular.$window}
   * @private
   */
  this.window_ = $window;
  /**
   * @type {angularGettext.Catalog}
   * @private
   */
  this.translate_ = gettextCatalog;
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
    var googUri = new goog.Uri(serviceUrl);
    googUri.setQueryData(goog.Uri.QueryData.createFromMap({
      //twitter params
      'text': this.window_.document.title,
      'via': 'geoportal_lux',
      'url': this.window_.location.href
    }));
    var popup =
      this.window_.open(googUri.toString(), '_blank', this.windowOptions);
    popup.focus();
  }
  return false;
};

/**
 * @export
 * @return {boolean}
 */
app.ShareDirectiveController.prototype.openMailLink = function() {
  var googUri = new goog.Uri();
  googUri.setScheme('mailto');
  googUri.setQueryData(goog.Uri.QueryData.createFromMap({
    'subject': this.window_.document.title +
      this.translate_.getString(' - link from geoportail.lu'),
    'body': this.window_.location.href
  }));
  this.window_.open(googUri.toString(), '_self', this.windowOptions);
  return false;
};

app.module.controller('AppShareController', app.ShareDirectiveController);
