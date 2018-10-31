goog.module('app.slider.SliderDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appSliderTemplateUrl Url to slider template.
 * @return {angular.Directive} The directive specs.
 * @ngInject
 */
exports = function(appSliderTemplateUrl) {
  return {
    restrict: 'A',
    scope: {
      'map': '=appSliderMap',
      'active': '=appSliderActive',
      'layers': '=appSliderLayers'
    },
    bindToController: true,
    controller: 'AppSliderController',
    controllerAs: 'ctrl'
  };
};


appModule.directive('appSlider', exports);
