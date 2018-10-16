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
goog.provide('app.infobar.InfobarController');

goog.require('app.module');


/**
 * @param {ngeo.offline.NetworkStatus} ngeoNetworkStatus ngeo Network Status.
 * @ngInject
 * @constructor
 * @export
 */
app.infobar.InfobarController = function(ngeoNetworkStatus) {
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
app.infobar.InfobarController.prototype.infobarSwitch = function() {
  this['infobarOpen'] = !this['infobarOpen'];
};

app.module.controller('AppInfobarController',
    app.infobar.InfobarController);
