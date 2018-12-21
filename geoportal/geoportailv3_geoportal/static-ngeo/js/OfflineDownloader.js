/**
 * @module app.OfflineDownloader
 */
import appModule from './module.js';
import Downloader from 'ngeo/offline/Downloader.js';

/**
 * @extends {ngeo.offline.Downloader}
 */
const OfflineDownloader = class extends Downloader {
  /**
   * @ngInject
   * @param {ngeo.offline.Configuration} ngeoOfflineConfiguration A service for customizing offline behaviour.
   * @param {app.MymapsOffline} appMymapsOffline mymaps offline service.
   * @param {angular.$window} $window Window.
   */
  constructor(ngeoOfflineConfiguration, appMymapsOffline, $window) {
    super(ngeoOfflineConfiguration);
    /**
     * @type {app.MymapsOffline}
     * @private
     */
    this.appMymapsOffline_ = appMymapsOffline;

    /**
     * @type {angular.$window}
     * @private
     */
    this.window_ = $window;
  }

  /**
   * @param {ol.Extent} extent The extent to download.
   * @param {ol.Map} map The map to work on.
   * @return {Promise} A promise resolving when save is finished.
   * @override
   */
  save(extent, map) {
    this.appMymapsOffline_.save();
    var piwik = /** @type {Piwik} */ (this.window_['_paq']);
    piwik.push([
      'setDocumentTitle',
      'saveOfflineMap'
    ]);
    piwik.push(['trackPageView']);
    return super.save(extent, map);
  }
};

appModule.service('appOfflineDownloader', OfflineDownloader);
const exports = OfflineDownloader;


export default exports;
