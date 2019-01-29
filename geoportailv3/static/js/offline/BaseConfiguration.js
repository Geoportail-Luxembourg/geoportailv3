goog.module('app.offline.BaseConfiguration');
goog.module.declareLegacyNamespace();

goog.require('ol.Observable');
goog.require('ol.layer.Layer');
goog.require('ol.layer.Vector');
goog.require('ol.layer.Tile');
goog.require('ol.layer.Image');
goog.require('ol.proj');
goog.require('ol.source.Image');
goog.require('ol.source.ImageWMS');
goog.require('ol.source.TileWMS');
goog.require('ol.tilegrid');
const SerializerDeserializer = goog.require('ngeo.offline.SerializerDeserializer');
const LocalforageCordovaWrapper = goog.require('app.offline.LocalforageCordovaWrapper');

goog.require('ngeo.CustomEvent');

const utils = goog.require('ngeo.offline.utils');
const defaultImageLoadFunction = ol.source.Image.defaultImageLoadFunction;


/**
 * @implements {ngeox.OfflineOnTileDownload}
 */
exports = class extends ol.Observable {

  /**
   * @ngInject
   * @param {!angular.Scope} $rootScope The rootScope provider.
   * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr .
   * @param {number} ngeoOfflineGutter .
   */
  constructor($rootScope, ngeoBackgroundLayerMgr, ngeoOfflineGutter) {
    super();

    this.localforage_ = this.createLocalforage();
    this.configureLocalforage();

    /**
     * @param {number} progress new progress.
     */
    this.dispatchProgress_ = (progress) => {
      this.dispatchEvent(new ngeo.CustomEvent('progress', {
        'progress': progress
      }));
    };

    /**
     * @private
     * @type {!angular.Scope}
     */
    this.rootScope_ = $rootScope;

    /**
     * @protected
     * @type {boolean}
     */
    this.hasData = false;
    this.initializeHasOfflineData();

    /**
     * @private
     * @type {ngeo.map.BackgroundLayerMgr}
     */
    this.ngeoBackgroundLayerMgr_ = ngeoBackgroundLayerMgr;

    /**
     * @private
     * @type {ngeo.offline.SerializerDeserializer}
     */
    this.serDes_ = new SerializerDeserializer({gutter: ngeoOfflineGutter});

    /**
     * @private
     * @type {number}
     */
    this.gutter_ = ngeoOfflineGutter;
  }

  /**
   * @protected
   */
  initializeHasOfflineData() {
    this.getItem('offline_content').then(value => this.setHasOfflineData(!!value));
  }

  /**
   * @export
   * @return {boolean} whether some offline data is available in the storage
   */
  hasOfflineData() {
    return this.hasData;
  }

  /**
   * @param {boolean} value whether there is offline data available in the storage.
   */
  setHasOfflineData(value) {
    const needDigest = value ^ this.hasData;
    this.hasData = value;
    if (needDigest) {
      this.rootScope_.$applyAsync(); // force update of the UI
    }
  }

  /**
   * Hook to allow measuring get/set item performance.
   * @param {string} msg .
   * @param {string} key .
   * @param {Promise<?>} promise .
   * @return {Promise<?>} .
   */
  traceGetSetItem(msg, key, promise) {
    return promise;
  }

  createLocalforage() {
    if (location.search.includes('cordova')) {
      console.log('Using cordova localforage');
      return new LocalforageCordovaWrapper();
    }
    return localforage;
  }

  configureLocalforage() {
    this.localforage_.config({
      'name': 'ngeoOfflineStorage',
      'version': 1.0,
      'storeName': 'offlineStorage'
    });
  }

  /**
   * @param {string} key .
   * @return {Promise<?>} .
   */
  getItem(key) {
    return this.traceGetSetItem('getItem', key, this.localforage_.getItem(key));
  }

  /**
   * @param {string} key .
   * @param {*} value .
   * @return {Promise<?>} .
   */
  setItem(key, value) {
    return this.traceGetSetItem('setItem', key, this.localforage_.setItem(key, value));
  }

  /**
   * @return {Promise} .
   */
  clear() {
    this.setHasOfflineData(false);
    return this.traceGetSetItem('clear', '', this.localforage_.clear());
  }

  /**
   * @param {!ol.Map} map .
   * @return {number} .
   */
  estimateLoadDataSize(map) {
    return 50;
  }

  /**
   * @param {ngeox.OfflineLayerMetadata} layerItem .
   * @return {string} A key identifying an offline layer and used during restore.
   */
  getLayerKey(layerItem) {
    return /** @type {string} */ (layerItem.layer.get('label'));
  }

  /**
   * @override
   * @param {number} progress .
   * @param {ngeox.OfflineTile} tile .
   * @return {Promise} .
   */
  onTileDownloadSuccess(progress, tile) {
    this.dispatchProgress_(progress);

    if (tile.response) {
      return this.setItem(utils.normalizeURL(tile.url), tile.response);
    }
    return Promise.resolve();
  }

  /**
   * @override
   * @param {number} progress .
   * @return {Promise} .
   */
  onTileDownloadError(progress) {
    this.dispatchProgress_(progress);
    return Promise.resolve();
  }

  /**
    * @param {ol.Map} map .
    * @param {ol.layer.Layer} layer .
    * @param {Array<ol.layer.Group>} ancestors .
    * @param {ol.Extent} userExtent The extent selected by the user.
    * @return {Array<ngeox.OfflineExtentByZoom>} .
   */
  getExtentByZoom(map, layer, ancestors, userExtent) {
    const currentZoom = map.getView().getZoom();
    // const viewportExtent = map.calculateExtent(map.getSize());

    const results = [];
    [0, 1, 2, 3, 4].forEach((dz) => {
      results.push({
        zoom: currentZoom + dz,
        extent: userExtent
      });
    });
    return results;
  }

  /**
   * @protected
   * @param {ol.source.Source} source .
   * @param {ol.proj.Projection} projection .
   * @return {ol.source.Source} .
   */
  sourceImageWMSToTileWMS(source, projection) {
    if (source instanceof ol.source.ImageWMS && source.getUrl() && source.getImageLoadFunction() === defaultImageLoadFunction) {
      const tileGrid = ol.tilegrid.createForProjection(source.getProjection() || projection, 42, 256);
      source = new ol.source.TileWMS({
        gutter: this.gutter_,
        url: source.getUrl(),
        tileGrid: tileGrid,
        attributions: source.getAttributions(),
        projection: source.getProjection(),
        params: source.getParams()
      });
    }
    return source;
  }

  /**
   * @param {ol.Map} map The map to work on.
   * @param {ol.Extent} userExtent The extent selected by the user.
   * @return {!Array<ngeox.OfflineLayerMetadata>} the downloadable layers and metadata.
   */
  createLayerMetadatas(map, userExtent) {
    const layersItems = [];

    /**
     * @param {ol.layer.Base} layer .
     * @param {Array<ol.layer.Group>} ancestors .
     * @return {boolean} whether to traverse this layer children.
     */
    const visitLayer = (layer, ancestors) => {
      if (layer instanceof ol.layer.Layer) {
        const extentByZoom = this.getExtentByZoom(map, layer, ancestors, userExtent);
        const projection = ol.proj.get(map.getView().getProjection());
        const source = this.sourceImageWMSToTileWMS(layer.getSource(), projection);
        let layerType;
        let layerSerialization;
        if (layer instanceof ol.layer.Tile || layer instanceof ol.layer.Image) {
          layerType = 'tile';
          layerSerialization = this.serDes_.serializeTileLayer(layer, source);
        } else if (layer instanceof ol.layer.Vector) {
          layerType = 'vector';
        }

        layersItems.push({
          backgroundLayer: this.ngeoBackgroundLayerMgr_.get(map) === layer,
          map,
          extentByZoom,
          layerType,
          layerSerialization,
          layer,
          source,
          ancestors
        });
      }
      return true;
    };
    map.getLayers().forEach((root) => {
      utils.traverseLayer(root, [], visitLayer);
    });
    return layersItems;
  }

  /**
   * @private
   * @param {ngeox.OfflinePersistentLayer} offlineLayer .
   * @return {function(ol.ImageTile, string)} .
   */
  createTileLoadFunction_(offlineLayer) {
    const that = this;
    /**
     * Load the tile from persistent storage.
     * @param {ol.ImageTile} imageTile .
     * @param {string} src .
     */
    const tileLoadFunction = function(imageTile, src) {
      that.getItem(utils.normalizeURL(src)).then((content) => {
        if (!content) {
          // use a transparent 1x1 image to make the map consistent
          content = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        }
        imageTile.getImage().src = content;
      });
    };
    return tileLoadFunction;
  }

  /**
   * @param {ngeox.OfflinePersistentLayer} offlineLayer .
   * @return {ol.layer.Layer} the layer.
   */
  recreateOfflineLayer(offlineLayer) {
    if (offlineLayer.layerType === 'tile') {
      const serialization = offlineLayer.layerSerialization;
      const tileLoadFunction = this.createTileLoadFunction_(offlineLayer);
      const layer = this.serDes_.deserializeTileLayer(serialization, tileLoadFunction);
      return layer;
    }
    return null;
  }

  /**
   * @return {number} .
   */
  getMaxNumberOfParallelDownloads() {
    return 11;
  }
};
