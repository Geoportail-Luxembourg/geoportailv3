goog.module('app.OfflineRestorer');
goog.module.declareLegacyNamespace();

goog.require('app');
goog.require('app.MymapsOffline');
goog.require('ngeo.offline.DefaultConfiguration');
const restorer = goog.require('ngeo.offline.Restorer');

/**
 * @extends {ngeo.offline.Restorer}
 */
const OfflineRestorer = class extends restorer {
  /**
   * @ngInject
   * @param {ngeox.OfflineConfiguration} ngeoOfflineConfiguration A service for customizing offline behaviour.
   * @param {app.MymapsOffline} appMymapsOffline mymaps offline service.
   */
  constructor(ngeoOfflineConfiguration, appMymapsOffline) {
    super(ngeoOfflineConfiguration);
    /**
     * @type {app.MymapsOffline}
     * @private
     */
    this.appMymapsOffline_ = appMymapsOffline;
  }

  /**
   * @param {ol.Map} map The map to work on.
   * @return {Promise<ol.Extent>} A promise resolving when restore is finished.
   * @override
   */
  restore(map) {
    this.appMymapsOffline_.restore();
    return super.restore(map);
  }
}

app.module.service('appOfflineRestorer', OfflineRestorer);
exports = OfflineRestorer;
