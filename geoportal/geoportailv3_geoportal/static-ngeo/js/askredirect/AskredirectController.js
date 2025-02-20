/**
 * @module app.askredirect.AskredirectController
 */
import appModule from '../module.js';

/**
 * @constructor
 * @param {angular.$window} $window Window.
 * @export
 * @ngInject
 */
const exports = function($window) {
  /**
   * @type {angular.$window}
   * @private
   */
  this.$window_ = $window;
};


/**
 * Redirect the map to the https version.
 * @export
 */
exports.prototype.redirect = function() {
  if (this.$window_.location.protocol !== 'https:') {
    var separator = '?';
    if (this.$window_.location.href.indexOf('?') >= 0) {
      separator = '&';
    }
    this.$window_.location.href =
        this.$window_.location.href.replace(/http:/g, 'https:') +
        separator + 'tracking=true';
  }
};


appModule.controller('AppAskredirectController',
                      exports);


export default exports;
