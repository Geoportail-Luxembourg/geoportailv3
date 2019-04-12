goog.module('app.query.casiporeportDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appCasiporeportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appCasiporeportTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'ids': '=appCasiporeportIds',
      'staging': '=appCasiporeportStaging'
    },
    controller: 'AppCasiporeportController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appCasiporeportTemplateUrl
  };
};
appModule.directive('appCasiporeport', exports);
