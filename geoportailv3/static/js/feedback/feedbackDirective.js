goog.module('app.feedback.feedbackDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');

/**
 * @param {string} appFeedbackTemplateUrl Url to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appFeedbackTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appFeedbackMap',
      'layers': '=appFeedbackLayers',
      'drawingTools': '=appFeedbackDrawingActive',
      'sidebarActive': '=appFeedbackSidebarActive',
      'active': '=appFeedbackActive'
    },
    controller: 'AppFeedbackController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appFeedbackTemplateUrl
  };
};

appModule.directive('appFeedback', exports);
