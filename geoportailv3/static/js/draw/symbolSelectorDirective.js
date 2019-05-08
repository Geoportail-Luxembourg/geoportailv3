goog.module('app.draw.symbolSelectorDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appSymbolSelectorTemplateUrl Url to style editing partial.
 * @return {angular.Directive} Directive Definition Object.
 * @ngInject
 */
exports = function(appSymbolSelectorTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'symbolSelector': '=appSymbolSelectorSymbol',
      'feature': '=appSymbolSelectorFeature'
    },
    controller: 'AppSymbolSelectorController',
    bindToController: true,
    controllerAs: 'ctrl',
    templateUrl: appSymbolSelectorTemplateUrl
  };
};

appModule.directive('appSymbolSelector', exports);
