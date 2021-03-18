/**
 * @module app.olcs.Lux3DManager
 */
import ngeoOlcsManager from 'ngeo/olcs/Manager.js';

import OLCesium from 'olcs/OLCesium.js';
import LuxRasterSynchronizer from './LuxRasterSynchronizer';
import VectorSynchronizer from 'olcs/VectorSynchronizer';


const exports = class extends ngeoOlcsManager {
  /**
   * @param {string} cesiumUrl Cesium URL.
   * @param {ol.Extent} cameraExtentInRadians The Luxembourg extent.
   * @param {ol.Map} map The map.
   * @param {ngeo.statemanager.Location} ngeoLocation The location service.
   * @param {angular.Scope} $rootScope The root scope.
   * @param {Array<string>} tiles3dLayers 3D tiles layers.
   * @param {string} tiles3dUrl 3D tiles server url.
   * @param {app.backgroundlayer.BlankLayer} appBlankLayer Blank layer service.
   * @param {ngeo.map.BackgroundLayerMgr2} ngeoBackgroundLayerMgr Background layer
   *     manager.
   */
  constructor(cesiumUrl, cameraExtentInRadians, map, ngeoLocation, $rootScope,
    tiles3dLayers, tiles3dUrl, appBlankLayer, ngeoBackgroundLayerMgr, $window) {
    super(cesiumUrl, $rootScope, {
      map,
      cameraExtentInRadians
    });
    /**
     * @type {angular.Scope}
     * @private
     */
    this.$rootScope_ = $rootScope;

    /**
     * @type {ngeo.map.BackgroundLayerMgr}
     * @private
     */
    this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;
    /**
     * @type {app.backgroundlayer.BlankLayer}
     * @private
     */
    this.blankLayer_ = appBlankLayer;

    /**
     * @private
     * @type {ngeo.statemanager.Location}
     */
    this.ngeoLocation_ = ngeoLocation;

    /*
     * A factor used to increase the screen space error of terrain tiles when they are partially in fog. The effect is to reduce
     * the number of terrain tiles requested for rendering. If set to zero, the feature will be disabled. If the value is increased
     * for mountainous regions, less tiles will need to be requested, but the terrain meshes near the horizon may be a noticeably
     * lower resolution. If the value is increased in a relatively flat area, there will be little noticeable change on the horizon.
     * type {Number}
     * default in Cesium 2.0
     * default in Ngeo 25.0
     */
    if (ngeoLocation.hasParam('fog_sse_factor')) {
      this.fogSSEFactor = parseFloat(ngeoLocation.getParam('fog_sse_factor'));
    }

    /*
     * A scalar that determines the density of the fog. Terrain that is in full fog are culled.
     * The density of the fog increases as this number approaches 1.0 and becomes less dense as it approaches zero.
     * The more dense the fog is, the more aggressively the terrain is culled. For example, if the camera is a height of
     * 1000.0m above the ellipsoid, increasing the value to 3.0e-3 will cause many tiles close to the viewer be culled.
     * Decreasing the value will push the fog further from the viewer, but decrease performance as more of the terrain is rendered.
     * type {Number}
     * default in Cesium 2.0e-4
     * default in Ngeo 1.0e-4
     */
    if (ngeoLocation.hasParam('fog_density')) {
      this.fogDensity = parseFloat(ngeoLocation.getParam('fog_density'));
    }

    /**
     * @const {ol.Extent}
     */
    this.luxCameraExtentInRadians = cameraExtentInRadians;

    /**
     * Array of 3D tiles set used for buildings/vegetation
     * @type {Array<Cesium.Cesium3DTileset>}
     */
    this.tilesets3d = [];

    /**
     * @private
     * @type {Array<string>}
     */
    this.availableTiles3dLayers_ = [];

    /**
     * @private
     * @type {Array<string>}
     */
    this.activeTiles3dLayers_ = [];

    /**
     * @private
     * @type {string}
     */
    this.tiles3dUrl_ = tiles3dUrl;

    /**
     * @private
     * @type {string}
     */
    this.mode_ = 'MESH';
    this.currentBgLayer;

  }

  /**
   * @override
   */
  instantiateOLCesium() {
    console.assert(this.map !== null && this.map !== undefined);
    const map = /** @type {!ol.Map} */ (this.map);
    const niceIlluminationDate = Cesium.JulianDate['fromDate'](new Date('June 21, 2018 12:00:00 GMT+0200'));
    const time = () => niceIlluminationDate;
    function createSynchronizers(map, scene) {
      return [
        new LuxRasterSynchronizer(map, scene),
        new VectorSynchronizer(map, scene)
      ];
    }
    const ol3d = new OLCesium({map, time, createSynchronizers});
    const scene = ol3d.getCesiumScene();

    if (this.ngeoLocation_.hasParam('tile_coordinates')) {
      scene.imageryLayers.addImageryProvider(new Cesium['TileCoordinatesImageryProvider']());
    }
    // for performance, limit terrain levels to be loaded
    const unparsedTerrainLevels = this.ngeoLocation_.getParam('terrain_levels');
    const availableLevels = unparsedTerrainLevels ? unparsedTerrainLevels.split(',').map(e => parseInt(e, 10)) : undefined;
    const rectangle = this.getCameraExtentRectangle();
    const terrainToDisplay = this.ngeoLocation_.getParam('3d_terrain') || 'own';
    const isIpv6 = location.search.includes('ipv6=true');
    const domain = (isIpv6) ? 'app.geoportail.lu' : 'geoportail.lu';

    const url = terrainToDisplay === 'own' ?
      'https://3dtiles.' + domain + '/tiles' :
      'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles';
    if (!this.ngeoLocation_.hasParam('no_terrain')) {
      this.terrainProvider = new Cesium.CesiumTerrainProvider({rectangle, url, availableLevels});
      this.noTerrainProvider = new Cesium.EllipsoidTerrainProvider({});
      scene.terrainProvider = this.noTerrainProvider;
    }
    return ol3d;
  }

  addAvailableLayers(layer) {
    if (this.availableTiles3dLayers_.map(x => x.id).indexOf(layer.id) < 0) {
      this.availableTiles3dLayers_.push(layer);
    }
  }

  init3dTilesFromLocation() {
    const layers_3d = this.ngeoLocation_.getParam('3d_layers');
    if (layers_3d) {
      const layers = layers_3d.split(',');
      this.availableTiles3dLayers_.filter(e => (layers.indexOf(e.layer) >= 0)).map(e => e.layer).forEach(this.add3dTile.bind(this));
      if (layers.indexOf('wintermesh') >= 0) {
        this.setMode('MESH');
      } else {
        this.setMode('3D');
      }
    }
    this.$rootScope_.$watch(function() {
      return this.activeTiles3dLayers_.length;
    }.bind(this), function(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.ngeoLocation_.updateParams({'3d_layers': this.activeTiles3dLayers_.join(',')});
      }
    }.bind(this));
  }

  /***
   * Initialize 3D tiles layers (buildings/vegetation)
   * @param {boolean} visible Initial visibility of 3D tiles.
   */
  init3dTiles(visible) {
    if (this.mode_ === 'MESH') {
      this.availableTiles3dLayers_.filter(e => e.layer === 'wintermesh').map(e => e.layer).forEach(this.add3dTile.bind(this));
    } else {
      this.availableTiles3dLayers_.filter(e => e.layer !== 'wintermesh').map(e => e.layer).forEach(this.add3dTile.bind(this));
    }
  }

  /**
   * Change 3D tiles layers visibility
   * @param {boolean} visible Visibility.
   */
  set3dTilesetsVisible(visible) {
    this.tilesets3d.forEach(tileset => tileset.show = visible);
  }

  set3dTilesetVisible(visible, layerName) {
    const tileset = this.tilesets3d.find((e) => e._url.includes('3dtiles/' + layerName + '/tileset.json'));
    tileset.show = visible;
  }

  add3dTile(layerName) {
    if (this.activeTiles3dLayers_.indexOf(layerName) >= 0) {
      return;
    }
    this.activeTiles3dLayers_.push(layerName);
    const url = this.tiles3dUrl_ + layerName + '/tileset.json';
    // Magic numbers are based on example at https://cesium.com/docs/cesiumjs-ref-doc/Cesium3DTileset.html and optimised for wintermesh layer.
    const tileset = new Cesium.Cesium3DTileset({
      url: url,
      skipLevelOfDetail: false,
      baseScreenSpaceError: 623,
      skipScreenSpaceErrorFactor: 8,
      skipLevels: 1,
      loadSiblings: true,
      cullWithChildrenBounds: true
    });

    this.tilesets3d.push(tileset);
    this.ol3d.getCesiumScene().primitives.add(tileset);
    // Adjust a tileset's height from the globe's surface.
    const scene = this.ol3d.getCesiumScene();
    if (layerName === 'wintermesh') {
      scene.screenSpaceCameraController.minimumZoomDistance = 150;
      //scene.terrainProvider = this.noTerrainProvider;
      scene.terrainProvider = this.terrainProvider;
      tileset.readyPromise.then(function(tileset) {
        //const heightOffset = -372;
        //const heightOffset = -47.8;
        const heightOffset = 0;
        const boundingSphere = tileset.boundingSphere;
        const cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);

        const surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);
        const offset = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, heightOffset);
        const translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
        tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
      }).otherwise(function(error) {
        console.log(error);
      });
    } else {
      scene.terrainProvider = this.terrainProvider;
      scene.screenSpaceCameraController.minimumZoomDistance = 0;
    }

  }

  remove3dLayer(layerName) {
    const layer = this.tilesets3d.find(e => e._url.includes('3dtiles/' + layerName + '/tileset.json'));
    if (layer !== undefined) {
      const idx = this.tilesets3d.findIndex(e => e._url.includes('3dtiles/' + layerName + '/tileset.json'));
      this.tilesets3d.splice(idx, 1);
      this.activeTiles3dLayers_.splice(idx, 1);
      this.ol3d.getCesiumScene().primitives.remove(layer);
    }
  }

  /**
   * @override
   */
  configureForUsability(scene) {
    //super.configureForUsability(scene);
    const camera = scene.camera;
    camera.constrainedAxisAngle = 7 * Math.PI / 16; // almost PI/2
  }
  /**
   * Reset to the north.
   * @export
   */
  resetNorth() {
    super.setHeading(super.getHeading());
  }

  /**
   * @return {Array<string>} The available tiles layers.
   * @export
   */
  getAvailableLayers() {
    return this.availableTiles3dLayers_;
  }
  /**
   * @return {string} The mode.
   * @export
   */
  getMode() {
    return this.mode_;
  }
  /**
   * @export
   * @return {Array<string>} The available tiles layer name.
   */
  getAvailableLayerName() {
    return this.availableTiles3dLayers_.map(e => e.layer);
  }
  get3DLayers() {
    const layers = [];
    this.tilesets3d.forEach(function(layer) {
      layers.push(layer._url.substring(layer._url.indexOf('3dtiles/') + 8, layer._url.indexOf('/tileset.json')));
    });
    return layers;
  }
  getActiveLayerName() {
    return this.activeTiles3dLayers_;
  }

  setMode(mode) {
    this.mode_ = mode;
  }

  remove3DLayers() {
    this.availableTiles3dLayers_.map(e => e.layer).forEach(function(layer) {
      this.remove3dLayer(layer);
    }.bind(this));
  }
  onToggle() {
    if (this.is3dEnabled()) {
      var piwik = /** @type {Piwik} */ (window['_paq']);
      if (this.mode_ === 'MESH') {
        this.currentBgLayer = this.backgroundLayerMgr_.get(this.map);
        this.backgroundLayerMgr_.set(this.map, this.blankLayer_.getLayer());
        piwik.push(['setDocumentTitle', 'enableMesh']);
      } else {
        if (this.currentBgLayer !== undefined) {
          this.backgroundLayerMgr_.set(this.map, this.currentBgLayer);
        }
        piwik.push(['setDocumentTitle', 'enable3d']);
      }
      piwik.push(['trackPageView']);
      this.init3dTiles();
    } else {
      if (this.currentBgLayer !== undefined) {
        this.backgroundLayerMgr_.set(this.map, this.currentBgLayer);
      }
      this.remove3DLayers();
      this.ngeoLocation_.deleteParam('3d_layers');
    }
  }

  toggleMode(mode) {
    this.setMode(mode);
    this.toggle3d().then(function() {
      this.onToggle();
    }.bind(this));
  }

  is3DEnabled() {
    if (this.getMode() === '3D') {
      return this.is3dEnabled();
    }
    return false;
  }

  isMeshEnabled() {
    if (this.getMode() === 'MESH') {
      return this.is3dEnabled();
    }
    return false;
  }

};


export default exports;
