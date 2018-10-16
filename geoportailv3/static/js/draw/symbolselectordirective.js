goog.provide('app.draw.symbolSelectorDirective');

goog.require('app.module');


/**
 * @param {string} appSymbolSelectorTemplateUrl Url to style editing partial.
 * @return {angular.Directive} Directive Definition Object.
 * @ngInject
 */
app.draw.symbolSelectorDirective = function(appSymbolSelectorTemplateUrl) {
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

app.module.directive('appSymbolSelector', app.draw.symbolSelectorDirective);
