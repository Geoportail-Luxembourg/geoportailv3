/**
 * @module app.OfflineDownloader
 */
import appModule from './module.js';
import Downloader from 'ngeo/offline/Downloader.js';
import MapBoxOffline from './offline/MapboxOffline.js';

/**
 * @extends {ngeo.offline.Downloader}
 */
const OfflineDownloader = class extends Downloader {
  /**
   * @ngInject
   * @param {ngeo.offline.Configuration} ngeoOfflineConfiguration A service for customizing offline behaviour.
   * @param {app.MymapsOffline} appMymapsOffline mymaps offline service.
   * @param {angular.$window} $window Window.
   * @param {import('./offline/MapboxOffline').default} appMapBoxOffline The MapBox offline service.
   * @param {ngeo.BackgroundLayerMgr} ngeoBackgroundLayerMgr The ngeo background manager.
   */
  constructor(ngeoOfflineConfiguration, appMymapsOffline, $window, appMapBoxOffline,ngeoBackgroundLayerMgr) {
    super(ngeoOfflineConfiguration);
    /**
     * @type {app.MymapsOffline}
     * @private
     */
    this.appMymapsOffline_ = appMymapsOffline;

    this.appMapBoxOffline_ = appMapBoxOffline;

    this.configuration_ = ngeoOfflineConfiguration;

    this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

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
    piwik.push([
      'setDocumentTitle',
      'saveOfflineMap'
    ]);
    piwik.push(['trackPageView']);

    // Keep a reference to the original mapbox layer
    let mapBoxLayer = null;
    const bgLayer = this.backgroundLayerMgr_.get(map);
    if (bgLayer.getMapBoxMap) {
        mapBoxLayer = bgLayer;
    }
    const superMethod = super.save.bind(this);
    return this.appMymapsOffline_.save().then(() => {
      let doFirst = Promise.resolve();
      if (mapBoxLayer) {
        // When we reach 100%
        const style = mapBoxLayer.getMapBoxMap().getStyle();
        const styleUrl = mapBoxLayer.get('defaultMapBoxStyle');
        const progressCb = p => this.configuration_.onTileDownloadError(p * 0.9);
        const extentByZoom = this.configuration_.getExtentByZoom(map, mapBoxLayer, [], extent);
        doFirst = this.appMapBoxOffline_.save(styleUrl, style, extentByZoom, progressCb);
      }
      return doFirst.then(() => superMethod(extent, map));
    });
  }
};

appModule.service('appOfflineDownloader', OfflineDownloader);
const exports = OfflineDownloader;


export default exports;
