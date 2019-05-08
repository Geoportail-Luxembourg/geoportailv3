/**
 * @module app.authentication.authenticationDirective
 */
import appModule from '../module.js';

/**
 * @param {string} appAuthenticationTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appAuthenticationTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'lang': '=appAuthenticationLang',
      'userOpen': '=appAuthenticationUseropen'
    },
    controller: 'AppAuthenticationController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appAuthenticationTemplateUrl
  };
};

appModule.directive('appAuthentication', exports);


export default exports;
