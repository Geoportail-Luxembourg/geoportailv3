/**
 * @module app.routing.routingDirective
 */
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

import appModule from '../module.js';

/**
 * @param {string} appRoutingTemplateUrl Url to routing template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appRoutingTemplateUrl) {
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


export default exports;
