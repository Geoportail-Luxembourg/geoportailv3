goog.provide('app.query.pagreportDirective');


goog.require('app.module');


/**
 * @param {string} appPagreportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.query.pagreportDirective = function(appPagreportTemplateUrl) {
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
app.module.directive('appPagreport', app.query.pagreportDirective);
