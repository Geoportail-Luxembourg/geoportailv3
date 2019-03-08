goog.module('app.OfflineDownloader');
goog.module.declareLegacyNamespace();

goog.require('app');
goog.require('app.MymapsOffline');
goog.require('ngeo.offline.Configuration');
const downloader = goog.require('ngeo.offline.Downloader');

/**
 * @extends {ngeo.offline.Downloader}
 */
const OfflineDownloader = class extends downloader {
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
    var piwik = /** @type {Piwik} */ (this.window_['_paq']);
    piwik.push(['setDocumentTitle', 'saveOfflineMap']);
    piwik.push(['trackPageView']);
    const superMethod = super.save.bind(this);
    return this.appMymapsOffline_.save().then(function() {
      return superMethod(extent, map);
    });
  }
};

app.module.service('appOfflineDownloader', OfflineDownloader);
exports = OfflineDownloader;
