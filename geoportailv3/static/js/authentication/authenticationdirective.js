goog.provide('app.authentication.authenticationDirective');

goog.require('app.module');


/**
 * @param {string} appAuthenticationTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.authentication.authenticationDirective = function(appAuthenticationTemplateUrl) {
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

app.module.directive('appAuthentication', app.authentication.authenticationDirective);
