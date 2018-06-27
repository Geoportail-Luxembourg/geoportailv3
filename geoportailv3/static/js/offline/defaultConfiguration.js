goog.module('app.offline.DefaultConfiguration');
goog.module.declareLegacyNamespace();

goog.require('ngeo.map.BackgroundLayerMgr');

const NgeoConfiguration = goog.require('ngeo.offline.DefaultConfiguration');

/**
 * @implements {ngeox.OfflineConfiguration}
 */
exports = class extends NgeoConfiguration {

  /**
   * @ngInject
   * @param {!angular.Scope} $rootScope The rootScope provider.
   * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer
   *     manager.
   */
  constructor($rootScope, ngeoBackgroundLayerMgr) {
    super($rootScope, ngeoBackgroundLayerMgr);

    /**
     * @type {ngeo.map.BackgroundLayerMgr}
     * @private
     */
    this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;
  }

  /**
   * @override
   * @param {ol.Map} map
   * @param {ol.layer.Layer} layer
   * @param {Array<ol.layer.Group>} ancestors
   * @param {ol.Extent} userExtent The extent selected by the user.
   * @return {Array<ngeox.OfflineExtentByZoom>}
   */
  getExtentByZoom(map, layer, ancestors, userExtent) {
    const currentZoom = map.getView().getZoom();
    const viewportExtent = map.getView().calculateExtent(map.getSize());

    const extent = this.isBgLayer_(layer, map) ? viewportExtent : userExtent;
    const zoomRange = [0, 1, 2, 3, 4].map(dz => dz + currentZoom);
    const zooms = this.isBgLayer_(layer, map) ?
      [8, 9, 10, 11, 12, 13, 14, 15, ...zoomRange.filter(dz => dz > 15)] :
      zoomRange;

    const results = [];
    zooms.forEach((dz) => {
      results.push({
        zoom: dz,
        extent: extent
      });
    });
    return results;
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

  isBgLayer_(layer, map) {
    return layer === this.backgroundLayerMgr_.get(map);
  }
};
