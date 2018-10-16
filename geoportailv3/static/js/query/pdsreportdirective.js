goog.provide('app.query.pdsreportDirective');


goog.require('app.module');


/**
 * @param {string} appPdsreportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.query.pdsreportDirective = function(appPdsreportTemplateUrl) {
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
app.module.directive('appPdsreport', app.query.pdsreportDirective);
