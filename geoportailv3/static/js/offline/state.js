/**
 * @fileoverview Provides a state manager for offline mode.
 */

goog.module('app.offline.State');
goog.module.declareLegacyNamespace();

goog.require('app');
goog.require('ngeo.offline.module');

/**
 * @constructor
 * @param {ngeo.offline.NetworkStatus} ngeoNetworkStatus ngeo network status service.
 * @ngInject
 */
const OfflineState = function(ngeoNetworkStatus) {

  /**
   * @type {ngeo.offline.NetworkStatus}
   */
  this.ngeoNetworkStatus = ngeoNetworkStatus;

  /**
   * @type {boolean}
   */
  this.offline = false;

};

/**
 * Clear the feature overlay.
 * @export
 */
OfflineState.prototype.isOffline = function() {
  return this.ngeoNetworkStatus.offline || this.offline;
};

/**
 * Set offline mode
 * @param {boolean} offline Are we in offline mode or not.
 */
OfflineState.prototype.setOffline = function(offline) {
  this.offline = offline;
};

app.module.service('appOfflineState', OfflineState);

exports = OfflineState;
