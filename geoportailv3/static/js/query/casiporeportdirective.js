goog.provide('app.query.casiporeportDirective');

goog.require('app.module');


/**
 * @param {string} appCasiporeportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.query.casiporeportDirective = function(appCasiporeportTemplateUrl) {
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
app.module.directive('appCasiporeport', app.query.casiporeportDirective);
