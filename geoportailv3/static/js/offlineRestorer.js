goog.module('app.OfflineRestorer');
goog.module.declareLegacyNamespace();

goog.require('app');
goog.require('app.MymapsOffline');

const OfflineRestorer = class {
  /**
   * @ngInject
   * @param {app.MymapsOffline} appMymapsOffline mymaps offline service.
   */
  constructor(appMymapsOffline) {
    /**
     * @type {app.MymapsOffline}
     * @private
     */
    this.appMymapsOffline_ = appMymapsOffline;
  }

  /**
   * Restore the stored objects on the map.
   */
  restore() {
    this.appMymapsOffline_.restore();
  }
}

app.module.service('appOfflineRestorer', OfflineRestorer);
exports = OfflineRestorer;
