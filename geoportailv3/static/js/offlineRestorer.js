goog.module('app.OfflineRestorer');
goog.module.declareLegacyNamespace();

goog.require('app');
goog.require('app.MymapsOffline');
goog.require('ngeo.offline.Configuration');
goog.require('app.offline.State');
goog.require('ngeo.map.BackgroundLayerMgr');

const restorer = goog.require('ngeo.offline.Restorer');

/**
 * @extends {ngeo.offline.Restorer}
 */
const OfflineRestorer = class extends restorer {
  /**
   * @ngInject
   * @param {ngeo.offline.Configuration} ngeoOfflineConfiguration A service for customizing offline behaviour.
   * @param {app.MymapsOffline} appMymapsOffline mymaps offline service.
   * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer manager.
   * @param {app.MymapsOffline} appMymapsOffline mymaps offline service.
   * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
   */
  constructor(ngeoOfflineConfiguration, ngeoBackgroundLayerMgr,
              appMymapsOffline, appDrawnFeatures ) {
    super(ngeoOfflineConfiguration, ngeoBackgroundLayerMgr);
    /**
     * @type {app.MymapsOffline}
     * @private
     */
    this.appMymapsOffline_ = appMymapsOffline;

    /**
     * @private
     * @type {app.DrawnFeatures}
     */
    this.appDrawnFeatures_ = appDrawnFeatures;
  }

  /**
   * @param {ol.Map} map The map to work on.
   * @return {Promise<ol.Extent>} A promise resolving when restore is finished.
   * @override
   */
  restore(map) {
    return super.restore(map).then((extent) => {
      this.appMymapsOffline_.restore();
      map.addLayer(this.appDrawnFeatures_.drawLayer);
      return extent;
    });
  }
};

app.module.service('appOfflineRestorer', OfflineRestorer);
exports = OfflineRestorer;
