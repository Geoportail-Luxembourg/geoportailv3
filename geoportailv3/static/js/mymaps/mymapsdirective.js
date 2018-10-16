/**
 * @fileoverview This file provides a "mymaps" directive. This directive is
 * used to insert a MyMaps block  into the HTML page.
 * Example:
 *
 * <app-mymaps></app-mymaps>
 *
 */
goog.provide('app.mymaps.mymapsDirective');

goog.require('app.module');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @param {string} appMymapsTemplateUrl The template url.
 * @ngInject
 */
app.mymaps.mymapsDirective = function(appMymapsTemplateUrl) {
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

app.module.directive('appMymaps', app.mymaps.mymapsDirective);
