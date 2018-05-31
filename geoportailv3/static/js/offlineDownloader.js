goog.module('app.OfflineDownloader');
goog.module.declareLegacyNamespace();

goog.require('app');
goog.require('app.MymapsOffline');
goog.require('ngeo.offline.DefaultConfiguration');
const downloader = goog.require('ngeo.offline.Downloader');

/**
 * @extends {ngeo.offline.Downloader}
 */
const OfflineDownloader = class extends downloader {
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
   * @param {ol.Extent} extent The extent to download.
   * @param {ol.Map} map The map to work on.
   * @return {Promise} A promise resolving when save is finished.
   * @override
   */
  save(extent, map) {
    this.appMymapsOffline_.save();
    return super.save(extent, map);
  }
}

app.module.service('appOfflineDownloader', OfflineDownloader);
exports = OfflineDownloader;
