/**
 * @module app.layerlegends.layerlegendsDirective
 */
/**
 * @fileoverview This file provides the layer manager directive. That directive
 * is used to create the list of selected layers in the page.
 *
 * Example:
 *
 * <app-layerlegends app-layerlegends-map="::mainCtrl.map"
 *     app-layerlegends-layers="::mainCtrl.selectedLayers">
 * </app-layerlegends>
 *
 * Note the use of the one-time binding operator (::) in the map and layers
 * expressions. One-time binding is used because we know the map and the array
 * of layers are not going to change during the lifetime of the application.
 * The content of the array of layers may change, but not the array itself.
 */

import appModule from '../module.js';

/**
 * @param {string} appLayerlegendsTemplateUrl Url to layerlegends template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appLayerlegendsTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'layers': '=appLayerlegendsLayers',
      'map': '=appLayerlegendsMap'
    },
    controller: 'AppLayerlegendsController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appLayerlegendsTemplateUrl
  };
};


appModule.directive('appLayerlegends', exports);


export default exports;
