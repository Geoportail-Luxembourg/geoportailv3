/**
 * @module app.query.casiporeportDirective
 */
import appModule from '../module.js';

/**
 * @param {string} appCasiporeportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appCasiporeportTemplateUrl) {
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


export default exports;
