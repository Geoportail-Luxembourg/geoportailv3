/**
 * @module app.slider.SliderDirective
 */
import appModule from '../module.js';

/**
 * @param {string} appSliderTemplateUrl Url to slider template.
 * @return {angular.Directive} The directive specs.
 * @ngInject
 */
const exports = function(appSliderTemplateUrl) {
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


export default exports;
