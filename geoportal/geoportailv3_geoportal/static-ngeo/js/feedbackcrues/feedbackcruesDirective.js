/**
 * @module app.feedbackcrues.feedbackcruesDirective
 */
import appModule from '../module.js';

/**
 * @param {string} appFeedbackcruesTemplateUrl Url to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appFeedbackcruesTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appFeedbackcruesMap',
      'layers': '=appFeedbackcruesLayers',
      'drawingTools': '=appFeedbackcruesDrawingActive',
      'sidebarActive': '=appFeedbackcruesSidebarActive',
      'active': '=appFeedbackcruesActive'
    },
    controller: 'AppFeedbackcruesController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appFeedbackcruesTemplateUrl
  };
};

appModule.directive('appFeedbackcrues', exports);


export default exports;
