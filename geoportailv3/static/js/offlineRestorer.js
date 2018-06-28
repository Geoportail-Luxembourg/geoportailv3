goog.module('app.OfflineRestorer');
goog.module.declareLegacyNamespace();

goog.require('app');
goog.require('app.MymapsOffline');
goog.require('ngeo.offline.DefaultConfiguration');
goog.require('ngeo.map.BackgroundLayerMgr');

const restorer = goog.require('ngeo.offline.Restorer');

/**
 * @extends {ngeo.offline.Restorer}
 */
const OfflineRestorer = class extends restorer {
  /**
   * @ngInject
   * @param {ngeox.OfflineConfiguration} ngeoOfflineConfiguration A service for customizing offline behaviour.
   * @param {app.MymapsOffline} appMymapsOffline mymaps offline service.
   * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer manager.
   */
  constructor(ngeoOfflineConfiguration, appMymapsOffline, ngeoBackgroundLayerMgr) {
    super(ngeoOfflineConfiguration, ngeoBackgroundLayerMgr);
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
    return super.restore(map).then((extent) => {
      this.appMymapsOffline_.restore();
      return extent;
    });
  }
};

app.module.service('appOfflineRestorer', OfflineRestorer);
exports = OfflineRestorer;
