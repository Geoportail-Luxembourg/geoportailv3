/**
 * @module app.query.pdsreportDirective
 */
import appModule from '../module.js';

/**
 * @param {string} appPdsreportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appPdsreportTemplateUrl) {
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


export default exports;
