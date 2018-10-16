/**
 * @fileoverview This file provides a external data directive. This directive
 * is used to create a external data panel in the page.
 *
 * Example:
 *
 * <app-external-data app-external-data-map="::mainCtrl.map"></app-external-data>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */
goog.provide('app.externaldata.externalDataDirective');

goog.require('app.module');


/**
 * @param {string} appExternalDataTemplateUrl Url to measure template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.externaldata.externalDataDirective = function(appExternalDataTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appExternalDataMap'
    },
    controller: 'AppExternalDataController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appExternalDataTemplateUrl
  };
};


app.module.directive('appExternalData', app.externaldata.externalDataDirective);
