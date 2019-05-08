goog.module('app.askredirect.askredirectDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');

/**
 * @param {string} appAskredirectTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appAskredirectTemplateUrl) {
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
appModule.directive('appAskredirect', exports);
