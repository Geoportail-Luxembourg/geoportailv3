goog.module('app.offline.Configuration');
goog.module.declareLegacyNamespace();

goog.require('ol');
goog.require('ol.layer.Vector');

const ngeoOfflineModule = goog.require('ngeo.offline.module');
const NgeoConfiguration = goog.require('ngeo.offline.Configuration');

/**
 */
exports = class extends NgeoConfiguration {

  /**
   * @ngInject
   * @param {!angular.Scope} $rootScope The rootScope provider.
   * @param {angular.$injector} $injector Main injector.
   * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer manager.
   * @param {ngeo.statemanager.Location} ngeoLocation The location service
   */
  constructor($rootScope, $injector, ngeoBackgroundLayerMgr, ngeoLocation) {
    const gutter = ngeoLocation.hasParam('offline_gutter') ? ngeoLocation.getParamAsInt('offline_gutter') : 96;
    console.assert(gutter !== undefined);
    ngeoOfflineModule.value('ngeoOfflineGutter', gutter);
    super($rootScope, ngeoBackgroundLayerMgr, /** @type {number} */ (gutter));

    /**
     * @type {ngeo.map.BackgroundLayerMgr}
     * @private
     */
    this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

    let appMymaps = null;
    if ($injector.has('appMymaps')) {
      appMymaps = $injector.get('appMymaps');
    }

    /**
     * @type {app.Mymaps}
     * @private
     */
    this.appMymaps_ = appMymaps;
  }

  /**
   * @override
   * @param {string} msg the message.
   * @param {string} key the key.
   * @param {Promise<?>} promise the promise.
   * @return {Promise<?>} the passed promise.
   */
  traceGetSetItem(msg, key, promise) {
    if (location.search.indexOf('trace_storage') === -1)  {
      return promise;
    }
    const start = new Date();
    console.log(msg, key, start);
    promise.then(
      () => console.log('OK', msg, key, new Date() - start),
      (err) => console.log('ERROR', msg, key, err, new Date() - start)
    );
    return promise;
  }


 /**
   * @override
   * @param {!ol.Map} map the map
   * @return {number} an estimated size in MB
   */
  estimateLoadDataSize(map) {
    let estimation = 0;
    const bgFactor = window.devicePixelRatio > 1 ? 2 : 1;
    const sizeOfANormalLayer = 20;
    const sizeOfABgLayer = bgFactor * sizeOfANormalLayer;
    map.getLayers().forEach((layer) => {
      if (!(layer instanceof ol.layer.Vector)) {
        if (this.isBgLayer_(layer, map)) {
          estimation += (layer.get('label') === 'blank') ? 0 : sizeOfABgLayer;
        } else {
          estimation += sizeOfANormalLayer;
        }
      }
    });
    if (this.appMymaps_ && this.appMymaps_.getMapId() !== '') {
      estimation += 5;
    }
    return estimation;
  }

  /**
   * @override
   * @param {ol.Map} map theo map
   * @param {ol.layer.Layer} layer the layer
   * @param {Array<ol.layer.Group>} ancestors the ancestors
   * @param {ol.Extent} userExtent The extent selected by the user.
   * @return {Array<ngeox.OfflineExtentByZoom>} the thing to return.
   */
  getExtentByZoom(map, layer, ancestors, userExtent) {
    const currentZoom = map.getView().getZoom();
    const zoomRange = [0, 1, 2, 3].map(dz => dz + currentZoom);

    if (this.isBgLayer_(layer, map)) {
      const zooms = [8, 9, 10, 11, 12, 13, 14, 15, ...zoomRange.filter(dz => dz > 15)];
      const view = map.getView();
      const userExtentSideInMeters = ol.extent.getWidth(userExtent);
      const fakeViewportSideInPixels = 2 * 1024;
      return zooms.map((z) => {
        const resolution = view.getResolutionForZoom(z);
        const fakeViewportSideInMeters = fakeViewportSideInPixels * resolution;
        let extent = userExtent;
        if (fakeViewportSideInMeters > userExtentSideInMeters) {
          // the fake viewport at this resolution covers a bigger area than the user extent
          extent = ol.extent.boundingExtent([ol.extent.getCenter(userExtent)]);
          ol.extent.buffer(extent, fakeViewportSideInMeters / 2, extent);
        }
        return {
          zoom: z,
          extent
        };
      });
    } else {
      return zoomRange.map((z) => {
        return {
          zoom: z,
          extent: userExtent
        };
      });
    }
  }

  /**
   * @override
   * @param {ol.Map} map The map to work on.
   * @param {ol.Extent} userExtent The extent selected by the user.
   * @return {!Array<ngeox.OfflineLayerMetadata>} the downloadable layers and metadata.
   */
  createLayerMetadatas(map, userExtent) {
    const layersItems = super.createLayerMetadatas(map, userExtent);
    return layersItems.filter(item => item.layerType === 'tile');
  }

  /**
   * @private
   * @param {ol.layer.Base} layer the layer.
   * @param {ol.Map} map the map.
   * @return {boolean} whether it is a backgroundl layer.
   */
  isBgLayer_(layer, map) {
    return layer === this.backgroundLayerMgr_.get(map);
  }
};
