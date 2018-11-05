/**
 * @module app.query.pagreportDirective
 */
import appModule from '../module.js';

/**
 * @param {string} appPagreportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appPagreportTemplateUrl) {
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


export default exports;
