goog.module('app.feedbackanf.feedbackanfDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');

/**
 * @param {string} appFeedbackanfTemplateUrl Url to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appFeedbackanfTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appFeedbackanfMap',
      'layers': '=appFeedbackanfLayers',
      'drawingTools': '=appFeedbackanfDrawingActive',
      'sidebarActive': '=appFeedbackanfSidebarActive',
      'active': '=appFeedbackanfActive'
    },
    controller: 'AppFeedbackanfController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appFeedbackanfTemplateUrl
  };
};

appModule.directive('appFeedbackanf', exports);
