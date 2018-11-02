/**
 * @module app.mymaps.mymapsDirective
 */
/**
 * @fileoverview This file provides a "mymaps" directive. This directive is
 * used to insert a MyMaps block  into the HTML page.
 * Example:
 *
 * <app-mymaps></app-mymaps>
 *
 */

import appModule from '../module.js';

/**
 * @return {angular.Directive} The Directive Object Definition.
 * @param {string} appMymapsTemplateUrl The template url.
 * @ngInject
 */
const exports = function(appMymapsTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'useropen': '=appMymapsUseropen',
      'drawopen': '=appMymapsDrawopen',
      'shareopen': '=appMymapsShareopen',
      'shareMymapsChecked': '=appMymapsShareMymapsChecked',
      'shareShowLongUrl': '=appMymapsShareShowLongUrl',
      'layersChanged': '=appMymapsLayersChanged',
      'map': '=appMymapsMap',
      'selectedLayers': '=appMymapsSelectedLayers'
    },
    controller: 'AppMymapsController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appMymapsTemplateUrl
  };
};


appModule.directive('appMymaps', exports);


export default exports;
