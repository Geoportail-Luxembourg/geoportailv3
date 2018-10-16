goog.provide('app.askredirect.AskredirectController');

goog.require('app.module');

/**
 * @constructor
 * @param {angular.$window} $window Window.
 * @param {ngeo.statemanager.Location} ngeoLocation ngeo location service.
 * @export
 * @ngInject
 */
app.askredirect.AskredirectController = function($window, ngeoLocation) {
  /**
   * @type {angular.$window}
   * @private
   */
  this.$window_ = $window;

  /**
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;
};


/**
 * Redirect the map to the https version.
 * @export
 */
app.askredirect.AskredirectController.prototype.redirect = function() {
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


app.module.controller('AppAskredirectController',
                      app.askredirect.AskredirectController);
