goog.provide('app.feedback.feedbackDirective');

goog.require('app.module');

/**
 * @param {string} appFeedbackTemplateUrl Url to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.feedback.feedbackDirective = function(appFeedbackTemplateUrl) {
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

app.module.directive('appFeedback', app.feedback.feedbackDirective);
