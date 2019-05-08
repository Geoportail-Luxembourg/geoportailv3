goog.module('app.layerinfo.layerinfoDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appLayerinfoTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appLayerinfoTemplateUrl) {
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

appModule.directive('appLayerinfo', exports);
