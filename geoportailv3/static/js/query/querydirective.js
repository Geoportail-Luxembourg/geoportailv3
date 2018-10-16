goog.provide('app.query.queryDirective');

goog.require('app.Activetool');
goog.require('app.GetDevice');
goog.require('app.LotChasse');
goog.require('app.profileDirective');
goog.require('app.module');


/**
 * @param {string} appQueryTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.query.queryDirective = function(appQueryTemplateUrl) {
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

app.module.directive('appQuery', app.query.queryDirective);
