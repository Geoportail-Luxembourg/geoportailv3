goog.module('app.query.pagreportDirective');


goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appPagreportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appPagreportTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'ids': '=appPagreportIds',
      'staging': '=appPagreportStaging'
    },
    controller: 'AppPagreportController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appPagreportTemplateUrl
  };
};
appModule.directive('appPagreport', exports);
