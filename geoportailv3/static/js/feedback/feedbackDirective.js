/**
 * @module app.feedback.feedbackDirective
 */
import appModule from '../module.js';

/**
 * @param {string} appFeedbackTemplateUrl Url to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appFeedbackTemplateUrl) {
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


export default exports;
