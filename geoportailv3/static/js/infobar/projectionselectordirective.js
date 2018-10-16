/**
 * @fileoverview This file provides a "projectionselector" directive
 * This directive is used to insert an Projection Selector and
 * Coordinate Display into the HTML page.
 * Example:
 *
 * <app-projectionselector app-projectionselector-map="::mainCtrl.map" >
 * </app-projectionselector>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */
goog.provide('app.infobar.projectionselectorDirective');

goog.require('app.module');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @param {string} appProjectionselectorTemplateUrl The template url.
 * @ngInject
 */
app.infobar.projectionselectorDirective = function(appProjectionselectorTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appProjectionselectorMap'
    },
    controller: 'AppProjectionselectorController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appProjectionselectorTemplateUrl
  };
};


app.module.directive('appProjectionselector', app.infobar.projectionselectorDirective);
