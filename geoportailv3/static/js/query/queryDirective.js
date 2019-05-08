goog.module('app.query.queryDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appQueryTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appQueryTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appQueryMap',
      'infoOpen': '=appQueryOpen',
      'layersOpen': '=appQueryLayersOpen',
      'mymapsOpen': '=appQueryMymapsOpen',
      'appSelector': '=appQueryAppselector',
      'routingOpen': '=appQueryRoutingOpen',
      'feedbackAnfOpen': '=appQueryFeedbackAnfOpen',
      'language': '=appQueryLanguage',
      'hiddenContent': '=appQueryHiddenInfo'
    },
    controller: 'AppQueryController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appQueryTemplateUrl
  };
};

appModule.directive('appQuery', exports);
