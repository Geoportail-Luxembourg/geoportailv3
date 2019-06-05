goog.module('app.feedbackage.feedbackageDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');

/**
 * @param {string} appFeedbackageTemplateUrl Url to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appFeedbackageTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appFeedbackageMap',
      'layers': '=appFeedbackageLayers',
      'drawingTools': '=appFeedbackageDrawingActive',
      'sidebarActive': '=appFeedbackageSidebarActive',
      'active': '=appFeedbackageActive'
    },
    controller: 'AppFeedbackageController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appFeedbackageTemplateUrl
  };
};

appModule.directive('appFeedbackage', exports);
