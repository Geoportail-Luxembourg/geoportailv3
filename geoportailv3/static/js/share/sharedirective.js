/**
 * @fileoverview This file provides a list of social sharing options.
 * This directive is used
 * to create a sharing panel in the page.
 *
 * Example:
 *
 * <app-share app-share-active=":mainCtrl.active"></app-share>
 *
 */
goog.provide('app.ShareDirectiveController');
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
      'active': '=appShareActive'
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
 * @param {gettext} gettext
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @export
 */
app.ShareDirectiveController = function($window, gettext, gettextCatalog) {
  /**
   * @type {Object}
   * @private
   */
  this.services_ = {
    'facebook': {url: 'https://www.facebook.com/dialog/feed'},
    'twitter': {url: 'https://www.twitter.com/intent/tweet'},
    'googlePlus': {url: 'https://plus.google.com/share'}
  };

  /**
   * @type {string}
   * @private
   */
  this.windowOptions_ =
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

  /**
   * @type {string}
   * @private
   */
  this.emailString_ = gettext(' - link from geoportail.lu');
};


/**
 * @export
 * @param {string} service Sharing Service Url.
 * @return {boolean}
 */
app.ShareDirectiveController.prototype.openShareLink = function(service) {
  if (service in this.services_) {
    var googUri = new goog.Uri(this.services_[service].url);
    googUri.setQueryData(goog.Uri.QueryData.createFromMap({
      //twitter params
      'text': this.window_.document.title,
      'via': 'geoportal_lux',
      'url': $('app-shorturl input').val()
    }));
    var popup =
        this.window_.open(googUri.toString(), '_blank', this.windowOptions_);
    popup.focus();
  }
  return false;
};


/**
 * @export
 * @return {boolean}
 */
app.ShareDirectiveController.prototype.openFbLink = function() {
  var googUri = new goog.Uri(this.services_['facebook'].url);
  googUri.setQueryData(goog.Uri.QueryData.createFromMap({
    //fb params
    'app_id': '162604997404468',
    'caption': this.window_.document.title,
    'display': 'popup',
    'link': $('app-shorturl input').val(),
    'redirect_uri': 'https://www.facebook.com'
  }));
  var popup =
      this.window_.open(googUri.toString(), '_blank', this.windowOptions_);
  popup.focus();
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
        this.translate_.getString(this.emailString_),
    'body': $('app-shorturl input').val()
  }));
  this.window_.open(googUri.toString(), '_self', this.windowOptions_);
  return false;
};

app.module.controller('AppShareController', app.ShareDirectiveController);
