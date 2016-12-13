goog.provide('app.AskredirectController');
goog.provide('app.askredirectDirective');

goog.require('app');
goog.require('ngeo.modalDirective');


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
 * @export
 * @ngInject
 */
app.AskredirectController = function($window) {
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
app.AskredirectController.prototype.redirect = function() {
  if (this.$window_.location.protocol !== 'https:') {
    this.$window_.location = 'https://' + this.$window_.location.hostname +
      this.$window_.location.pathname + this.$window_.location.hash;
  }
};


app.module.controller('AppAskredirectController',
                      app.AskredirectController);
