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
goog.module('app.share.ShareController');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');
const ngeoUtils = goog.require('ngeo.utils');


/**
 * @ngInject
 * @constructor
 * @param {angular.$window} $window The window service.
 * @param {gettext} gettext The gettext service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @export
 */
exports = function($window, gettext, gettextCatalog) {
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
 * @return {boolean} Always return false.
 */
exports.prototype.openShareLink = function(service) {
  if (service in this.services_) {
    var url = this.services_[service].url + '?' + ngeoUtils.encodeQueryString({
      //twitter params
      'text': this.window_.document.title,
      'via': 'geoportal_lux',
      'url': $('app-shorturl input').val()
    });
    var popup =
        this.window_.open(url, '_blank', this.windowOptions_);
    popup.focus();
  }
  return false;
};


/**
 * @export
 * @return {boolean} Always return false.
 */
exports.prototype.openFbLink = function() {
  var url = this.services_['facebook'].url + '?' + ngeoUtils.encodeQueryString({
    //fb params
    'app_id': '162604997404468',
    'caption': this.window_.document.title,
    'display': 'popup',
    'link': $('app-shorturl input').val(),
    'redirect_uri': 'https://www.facebook.com'
  });
  var popup =
      this.window_.open(url, '_blank', this.windowOptions_);
  popup.focus();
  return false;
};


/**
 * @export
 * @return {boolean} Always return False.
 */
exports.prototype.openMailLink = function() {
  var url = 'mailto:?' + ngeoUtils.encodeQueryString({
    'subject': this.window_.document.title +
        this.translate_.getString(this.emailString_),
    'body': $('app-shorturl input').val()
  });

  this.window_.open(url, '_self', this.windowOptions_);
  return false;
};

appModule.controller('AppShareController', exports);
