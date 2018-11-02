/**
 * @module app.draw.styleEditingDirective
 */
import appModule from '../module.js';

/**
 * @param {string} appStyleEditingTemplateUrl Url to style editing partial.
 * @return {angular.Directive} Directive Definition Object.
 * @ngInject
 */
const exports = function(appStyleEditingTemplateUrl) {
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


export default exports;
