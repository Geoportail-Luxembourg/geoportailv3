goog.module('app.draw.styleEditingDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appStyleEditingTemplateUrl Url to style editing partial.
 * @return {angular.Directive} Directive Definition Object.
 * @ngInject
 */
exports = function(appStyleEditingTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'feature': '=appStyleEditingFeature',
      'editingStyle': '=appStyleEditingStyle'
    },
    controller: 'AppStyleEditingController',
    bindToController: true,
    controllerAs: 'ctrl',
    templateUrl: appStyleEditingTemplateUrl
  };
};

appModule.directive('appStyleediting', exports);
