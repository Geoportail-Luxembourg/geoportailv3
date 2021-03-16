/**
 * @module app.layerinfo.layerinfoDirective
 */
import appModule from '../module.js';

/**
 * @param {string} appLayerinfoTemplateUrl URL to directive template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appLayerinfoTemplateUrl) {
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


export default exports;
