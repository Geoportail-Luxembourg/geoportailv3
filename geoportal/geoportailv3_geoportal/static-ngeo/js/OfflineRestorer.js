/**
 * @module app.OfflineRestorer
 */
import appModule from './module.js';
import Restorer from 'ngeo/offline/Restorer.js';


/**
 * @extends {Restorer}
 */
const OfflineRestorer = class extends Restorer {
  /**
   * @ngInject
   * @param {ngeo.offline.Configuration} ngeoOfflineConfiguration A service for customizing offline behaviour.
   * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer manager.
   * @param {app.MymapsOffline} appMymapsOffline mymaps offline service.
   * @param {app.draw.DrawnFeatures} appDrawnFeatures Drawn features service.
   * @param {import('./offline/MapboxOffline').default} appMapBoxOffline The MapBox offline service.
   */
  constructor(ngeoOfflineConfiguration, ngeoBackgroundLayerMgr,
              appMymapsOffline, appDrawnFeatures, appMapBoxOffline) {
    super(ngeoOfflineConfiguration, ngeoBackgroundLayerMgr);
    /**
     * @type {app.MymapsOffline}
     * @private
     */
    this.appMymapsOffline_ = appMymapsOffline;

    /**
     * @private
     * @type {app.draw.DrawnFeatures}
     */
    this.appDrawnFeatures_ = appDrawnFeatures;

    this.appMapBoxOffline_ = appMapBoxOffline;

    this.ngeoBackgroundLayerMgr_ = ngeoBackgroundLayerMgr;

    /**
     * @type {boolean}
     */
    this.restoring = false;
  }

  /**
   * @param {ol.Map} map The map to work on.
   * @return {Promise<ol.Extent>} A promise resolving when restore is finished.
   * @override
   */
  restore(map) {
    this.restoring = true;
    const bgLayer = this.ngeoBackgroundLayerMgr_.get(map);
    return super.restore(map).then((extent) => {
      // Keep a reference to the original mapbox layer
      let mapBoxLayer = null;
      if (bgLayer.getMapBoxMap) {
        mapBoxLayer = bgLayer;
      }

      this.appMymapsOffline_.restore();
      if (mapBoxLayer) {
        console.log('Restoring MapBox');
        this.appMapBoxOffline_.restore(mapBoxLayer);
        this.ngeoBackgroundLayerMgr_.set(map, mapBoxLayer);
      }
      map.addLayer(this.appDrawnFeatures_.drawLayer);
      this.restoring = false;
      return extent;
    });
  }

  /**
   * @param {ol.Map} map The map.
   * @param {ngeox.OfflinePersistentContent} offlineContent The offline content.
   * @return {ol.Extent} the extent.
   * @override
   */
  doRestore(map, offlineContent) {
    const view = map.getView();
    const {zooms} = offlineContent;
    view.setMinZoom(zooms[0]);
    view.setMaxZoom(zooms[zooms.length - 1 ]);
    return super.doRestore(map, offlineContent);
  }

};

appModule.service('appOfflineRestorer', OfflineRestorer);
const exports = OfflineRestorer;


export default exports;
