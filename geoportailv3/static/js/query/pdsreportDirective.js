goog.module('app.query.pdsreportDirective');


goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appPdsreportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appPdsreportTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'ids': '=appPdsreportIds',
      'staging': '=appPdsreportStaging'
    },
    controller: 'AppPdsreportController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appPdsreportTemplateUrl
  };
};
appModule.directive('appPdsreport', exports);
