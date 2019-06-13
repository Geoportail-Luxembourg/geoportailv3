/**
 * @module app.feedbackanf.feedbackageDirective
 */
import appModule from '../module.js';


/**
 * @param {string} appFeedbackageTemplateUrl Url to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appFeedbackageTemplateUrl) {
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


export default exports;
