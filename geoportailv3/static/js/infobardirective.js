/**
 * @fileoverview This file provides a "infobar" directive. This directive is
 * used to insert an OpenLayers Custom Control Info Bar into the HTML page. It is
 * based on the "ngeo-control" directive.
 *
 * Example:
 *
 * <app-scaleline app-scaleline-map="::mainCtrl.map"map></app-scaleline>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */
goog.provide('app.infobarDirective');

goog.require('app');
goog.require('ngeo.controlDirective');
goog.require('ol.control.Attribution');

/**
 * @return {angular.Directive} The Directive Object Definition.
 * @ngInject
 */
app.infobarDirective = function() {
  return {
    restrict: 'E',
    scope: {
      'map': '=appInfoBarMap'
    },
    controller: 'AppInfoBarController',
    controllerAs: 'ctrl',
    bindToController: true,
    template: '<div ngeo-control="ctrl.control"' +
        'ngeo-control-map="ctrl.map">'
  };
};


app.module.directive('appInfoBar', app.infobarDirective);



/**
 * @ngInject
 * @constructor
 */
app.InfoBarDirectiveController = function() {
  /**
   * @type {ol.control.Attribution}
   */
  this['control'] = new ol.control.Attribution();
  console.log('infobardirective got executed!')
};


app.module.controller('AppInfoBarController',
    app.InfoBarDirectiveController);
