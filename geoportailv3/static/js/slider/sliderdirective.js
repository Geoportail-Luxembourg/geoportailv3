goog.provide('app.slider.SliderDirective');

goog.require('app.module');


/**
 * @param {string} appSliderTemplateUrl Url to slider template.
 * @return {angular.Directive} The directive specs.
 * @ngInject
 */
app.slider.SliderDirective = function(appSliderTemplateUrl) {
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


app.module.directive('appSlider', app.slider.SliderDirective);
