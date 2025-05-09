/**
 * @module ngeo.offline.Configuration
 */
import olObservable from 'ol/Observable.js';
import olLayerLayer from 'ol/layer/Layer.js';
import olLayerVector from 'ol/layer/Vector.js';
import olLayerTile from 'ol/layer/Tile.js';
import olLayerImage from 'ol/layer/Image.js';
import * as olProj from 'ol/proj.js';
import olSourceImageWMS from 'ol/source/ImageWMS.js';
import olSourceTileWMS from 'ol/source/TileWMS.js';
import {createForProjection as createTileGridForProjection} from 'ol/tilegrid.js';
import SerializerDeserializer from 'ngeo/offline/SerializerDeserializer.js';
import LocalforageCordovaWrapper from 'ngeo/offline/LocalforageCordovaWrapper.js';
import LocalforageAndroidWrapper from 'ngeo/offline/LocalforageAndroidWrapper.js';
import LocalforageIosWrapper from 'ngeo/offline/LocalforageIosWrapper.js';
import ngeoCustomEvent from 'ngeo/CustomEvent.js';
import utils from 'ngeo/offline/utils.js';
import {defaultImageLoadFunction} from 'ol/source/Image.js';


import { useOffline, useOfflineLayers } from "luxembourg-geoportail/bundle/lux.dist.js";

import * as realLocalforage from 'localforage';

/**
 * @implements {ngeox.OfflineOnTileDownload}
 */
const exports = class extends olObservable {

  /**
   * @ngInject
   * @param {!angular.Scope} $rootScope The rootScope provider.
   * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr The background layer manager
   * @param {number} ngeoOfflineGutter A gutter around the tiles to download (to avoid cut symbols)
   */
  constructor($rootScope, ngeoBackgroundLayerMgr, ngeoOfflineGutter) {
    super();

    this.localforage_ = this.createLocalforage();
    this.configureLocalforage();

    useOffline().initLocalforage_v3(this.localforage_);

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
   * @private
   * @param {number} progress new progress.
   */
  dispatchProgress_(progress) {
    this.dispatchEvent(new ngeoCustomEvent('progress', {
      'progress': progress
    }));
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
   * @param {string} msg A message
   * @param {string} key The key to work on
   * @param {Promise<?>} promise A promise
   * @return {Promise<?>} The promise we passed
   */
  traceGetSetItem(msg, key, promise) {
    return promise;
  }

  createLocalforage() {
    if (location.search.includes('localforage=cordova')) {
      console.log('Using cordova localforage');
      return new LocalforageCordovaWrapper();
    } else if (location.search.includes('localforage=android')) {
      console.log('Using android localforage');
      return new LocalforageAndroidWrapper();
    } else if (location.search.includes('localforage=ios')) {
      console.log('Using ios localforage');
      return new LocalforageIosWrapper();
    }
    return realLocalforage;
  }

  configureLocalforage() {
    this.localforage_.config({
      'name': 'ngeoOfflineStorage',
      'version': 1.0,
      'storeName': 'offlineStorage'
    });
  }

  /**
   * @param {string} key The key
   * @return {Promise<?>} A promise
   */
  getItem(key) {
    return this.traceGetSetItem('getItem', key, this.localforage_.getItem(key));
  }

  /**
   * @param {string} key .
   * @return {Promise<?>} .
   */
  removeItem(key) {
    return this.traceGetSetItem('removeItem', key, this.localforage_.removeItem(key));
  }

  /**
   * @param {string} key The key
   * @param {*} value A value
   * @return {Promise<?>} A promise
   */
  setItem(key, value) {
    return this.traceGetSetItem('setItem', key, this.localforage_.setItem(key, value));
  }

  /**
   * @return {Promise} A promise
   */
  clear() {
    this.setHasOfflineData(false);
    return this.traceGetSetItem('clear', '', this.localforage_.clear());
  }

  /**
   * @param {!ol.Map} map A map
   * @return {number} An "estimation" of the size of the data to download
   */
  estimateLoadDataSize(map) {
    return 50;
  }

  /**
   * @param {ngeox.OfflineLayerMetadata} layerItem The layer metadata
   * @return {string} A key identifying an offline layer and used during restore.
   */
  getLayerKey(layerItem) {
    return /** @type {string} */ (layerItem.layer.get('label'));
  }

  /**
   * @override
   * @param {number} progress The download progress
   * @param {ngeox.OfflineTile} tile The tile
   * @return {Promise} A promise
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
   * @param {number} progress The progress
   * @return {Promise} A promise
   */
  onTileDownloadError(progress) {
    this.dispatchProgress_(progress);
    return Promise.resolve();
  }

  /**
    * @param {ol.Map} map A map
    * @param {ol.layer.Layer} layer A layer
    * @param {Array<ol.layer.Group>} ancestors The ancestors of that layer
    * @param {ol.Extent} userExtent The extent selected by the user.
    * @return {Array<ngeox.OfflineExtentByZoom>} The extent to download per zoom level
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
   * @param {ol.source.Source} source An ImageWMS source
   * @param {ol.proj.Projection} projection The projection
   * @return {ol.source.Source} A tiled equivalent source
   */
  sourceImageWMSToTileWMS(source, projection) {
    if (source instanceof olSourceImageWMS && source.getUrl() && source.getImageLoadFunction() === defaultImageLoadFunction) {
      const tileGrid = createTileGridForProjection(source.getProjection() || projection, 42, 256);
      source = new olSourceTileWMS({
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
    const visitLayer = (layer, ancestors, saveBackground = false) => {
      if (layer instanceof olLayerLayer) {
        const extentByZoom = this.getExtentByZoom(map, layer, ancestors, userExtent);
        const projection = olProj.get(map.getView().getProjection());
        const source = this.sourceImageWMSToTileWMS(layer.getSource(), projection);
        let layerType;
        let layerSerialization;
        if (layer instanceof olLayerTile || layer instanceof olLayerImage) {
          layerType = 'tile';
          layerSerialization = this.serDes_.serializeTileLayer(layer, source);
        } else if (layer instanceof olLayerVector) {
          layerType = 'vector';
        } else if (layer.getMapBoxMap) {
          layerType = 'bg_vector';
        }

        const backgroundLayer = this.ngeoBackgroundLayerMgr_.get(map) === layer;


        if (!saveBackground && backgroundLayer) {
          // Fix for v4, if this is not a bg and it is not explicitly
          // said that must savebg, do not save
          // because map.getLayers() cannot retrieve the bg layer when bg is vector (but can when bg raster)
          return;
        }

        layersItems.push({
          backgroundLayer,
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

    // Save all layer
    map.getLayers().forEach((root) => {
      utils.traverseLayer(root, [], visitLayer);
    });

    // Fix for v4, retrieve bg vector from store
    // because map.getLayers() cannot retrieve the bg layer when bg is vector (but can when bg raster)

    const backgroundLayer = this.ngeoBackgroundLayerMgr_.get(map);
    visitLayer(backgroundLayer, [], true);

    return layersItems;
  }

  /**
   * @private
   * @param {ngeox.OfflinePersistentLayer} offlineLayer The offline layer
   * @return {function(ol.ImageTile, string)} the tile function
   */
  createTileLoadFunction_(offlineLayer) {
    const that = this;
    /**
     * Load the tile from persistent storage.
     * @param {ol.ImageTile} imageTile The image tile
     * @param {string} src The tile URL
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
   * @param {ngeox.OfflinePersistentLayer} offlineLayer The layer to recreate
   * @return {ol.layer.Layer} the layer.
   */
  recreateOfflineLayer(offlineLayer) {
    if (offlineLayer.layerType === 'tile') {
      // DEACTIVATE v3 offline layer creation
      // ------
      // const serialization = offlineLayer.layerSerialization;
      // const tileLoadFunction = this.createTileLoadFunction_(offlineLayer);
      // const layer = this.serDes_.deserializeTileLayer(serialization, tileLoadFunction);      
      // return layer;
    }
    // return null;
  }

  /**
   * @return {number} The number
   */
  getMaxNumberOfParallelDownloads() {
    return 11;
  }
};


export default exports;
