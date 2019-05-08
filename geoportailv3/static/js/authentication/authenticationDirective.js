goog.module('app.authentication.authenticationDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appAuthenticationTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appAuthenticationTemplateUrl) {
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
