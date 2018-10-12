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
goog.provide('app.InfobarDirectiveController');
goog.provide('app.infobarDirective');

goog.require('app.module');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @param {string} appInfobarTemplateUrl The template url.
 * @ngInject
 */
app.infobarDirective = function(appInfobarTemplateUrl) {
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


app.module.directive('appInfobar', app.infobarDirective);


/**
 * @param {ngeo.offline.NetworkStatus} ngeoNetworkStatus ngeo Network Status.
 * @ngInject
 * @constructor
 * @export
 */
app.InfobarDirectiveController = function(ngeoNetworkStatus) {
  /**
   * @type {boolean}
   */
  this['infobarOpen'] = false;

  /**
   * @type {ngeo.offline.NetworkStatus}
   * @export
   */
  this.ngeoNetworkStatus = ngeoNetworkStatus;
};


/**
 * @export
 */
app.InfobarDirectiveController.prototype.infobarSwitch = function() {
  this['infobarOpen'] = !this['infobarOpen'];
};

app.module.controller('AppInfobarController',
    app.InfobarDirectiveController);
