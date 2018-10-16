/**
 * @fileoverview This file provides a "infobar" directive. This directive is
 * used to insert an Info Bar into the HTML page.
 * Example:
 *
 * <app-infobar app-infobar-map="::mainCtrl.map"></app-infobar>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */
goog.provide('app.infobar.infobarDirective');

goog.require('app.module');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @param {string} appInfobarTemplateUrl The template url.
 * @ngInject
 */
app.infobar.infobarDirective = function(appInfobarTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appInfobarMap'
    },
    controller: 'AppInfobarController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appInfobarTemplateUrl
  };
};


app.module.directive('appInfobar', app.infobar.infobarDirective);
