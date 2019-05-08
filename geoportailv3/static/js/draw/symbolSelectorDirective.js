/**
 * @module app.draw.symbolSelectorDirective
 */
import appModule from '../module.js';

/**
 * @param {string} appSymbolSelectorTemplateUrl Url to style editing partial.
 * @return {angular.Directive} Directive Definition Object.
 * @ngInject
 */
const exports = function(appSymbolSelectorTemplateUrl) {
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


export default exports;
