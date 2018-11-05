/**
 * @module app.askredirect.askredirectDirective
 */
import appModule from '../module.js';

/**
 * @param {string} appAskredirectTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appAskredirectTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'showRedirect': '=appAskredirectShow'
    },
    controller: 'AppAskredirectController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appAskredirectTemplateUrl
  };
};

appModule.directive('appAskredirect', exports);


export default exports;
