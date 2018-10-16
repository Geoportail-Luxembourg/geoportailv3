goog.provide('app.layerinfo.layerinfoDirective');

goog.require('app.module');


/**
 * @param {string} appLayerinfoTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.layerinfo.layerinfoDirective = function(appLayerinfoTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'layer': '=appLayerinfoLayer'
    },
    controller: 'AppLayerinfoController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appLayerinfoTemplateUrl
  };
};

app.module.directive('appLayerinfo', app.layerinfo.layerinfoDirective);
