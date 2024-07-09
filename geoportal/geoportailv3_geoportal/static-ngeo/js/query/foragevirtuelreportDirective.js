/**
 * @module app.query.foragevirtuelreportDirective
 */
import appModule from '../module.js';

/**
 * @param {string} appForagevirtuelreportTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appForagevirtuelreportTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'features': '=appForagevirtuelFeatures',
    },
    controller: 'AppForagevirtuelreportController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appForagevirtuelreportTemplateUrl
  };
};

appModule.directive('appForagevirtuelreport', exports);


export default exports;
