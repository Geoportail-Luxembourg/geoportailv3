/**
 * @fileoverview This file provides the routing directive. That directive
 * is used to create the routing panel in the side panel.
 *
 * Example:
 *
 * <app-routing app-routing-map="::mainCtrl.map"
 * </app-routing>
 *
 */
goog.module('app.routing.routingDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appRoutingTemplateUrl Url to routing template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appRoutingTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appRoutingMap',
      'hasResult': '=appRoutingHasResult',
      'showRedirect': '=appRoutingShowRedirect'
    },
    controller: 'AppRoutingController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appRoutingTemplateUrl
  };
};


appModule.directive('appRouting', exports);
