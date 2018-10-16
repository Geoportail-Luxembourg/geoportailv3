goog.provide('app.askredirect.askredirectDirective');

goog.require('app.module');

/**
 * @param {string} appAskredirectTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.askredirect.askredirectDirective = function(appAskredirectTemplateUrl) {
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
app.module.directive('appAskredirect', app.askredirect.askredirectDirective);
