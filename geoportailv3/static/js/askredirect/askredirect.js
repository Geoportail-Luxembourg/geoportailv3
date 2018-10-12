goog.provide('app.AskredirectController');
goog.provide('app.askredirectDirective');

goog.require('app.module');

/**
 * @param {string} appAskredirectTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.askredirectDirective = function(appAskredirectTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'showRedirect': '=appAskredirectShow'
    },
    controller: 'AppAskredirectController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appAskredirectTemplateUrl
  };
};
app.module.directive('appAskredirect', app.askredirectDirective);


/**
 * @constructor
 * @param {angular.$window} $window Window.
 * @param {ngeo.statemanager.Location} ngeoLocation ngeo location service.
 * @export
 * @ngInject
 */
app.AskredirectController = function($window, ngeoLocation) {
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
app.AskredirectController.prototype.redirect = function() {
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
                      app.AskredirectController);
