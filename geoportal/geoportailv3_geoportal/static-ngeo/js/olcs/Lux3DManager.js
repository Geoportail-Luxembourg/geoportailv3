/**
 * @module app.olcs.Lux3DManager
 */
import ngeoOlcsManager from 'ngeo/olcs/Manager.js';
import ngeoCustomEvent from 'ngeo/CustomEvent.js';
import appNotifyNotificationType from '../NotifyNotificationType.js';


import OLCesium from 'olcs/OLCesium.js';
import LuxRasterSynchronizer from './LuxRasterSynchronizer';
import VectorSynchronizer from 'olcs/VectorSynchronizer';
import { useOpenLayers, useMapStore, storeToRefs, watch } from "luxembourg-geoportail/bundle/lux.dist.mjs";


class Wrap3dLayer {
  // Wrapper class for 3D layers so that they behave partly like OL layers.
  // This (limited) methods of this wrapper class (get, getOpacity) are used in the exclusion manager
  constructor(layer) {
    this.layer_ = layer;
  }
  getOpacity() {
    return 1;
  }
  get (key) {
    if (key === "label") {
      return this.layer_.name;
    }
    else if (key === "metadata") {
      return this.layer_.metadata;
    }
  }
}

const exports = class extends ngeoOlcsManager {
  /**
   * @param {string} cesiumUrl Cesium URL.
   * @param {ol.Map} map The map.
   * @param {ngeo.statemanager.Location} ngeoLocation The location service.
   * @param {angular.Scope} $rootScope The root scope.
   * @param {Array<string>} tiles3dLayers 3D tiles layers.
   * @param {string} tiles3dUrl 3D tiles server url.
   * @param {app.backgroundlayer.BlankLayer} appBlankLayer Blank layer service.
   */
  constructor(cesiumUrl, ipv6Substitution, map, ngeoLocation, $rootScope,
              tiles3dLayers, tiles3dUrl, appBlankLayer,
              appNotify, gettextCatalog, appThemes) {
    super(cesiumUrl, $rootScope, {map});
    /**
     * @type {angular.Scope}
     * @private
     */
    this.$rootScope_ = $rootScope;

    /**
     * @type {app.backgroundlayer.BlankLayer}
     * @private
     */
    this.blankLayer_ = appBlankLayer;

    this.notify_ = appNotify;
    this.gettextCatalog = gettextCatalog;
    /**
     * @private
     * @type {ngeo.statemanager.Location}
     */
    this.ngeoLocation_ = ngeoLocation;

    this.ipv6Substitution_ =  ipv6Substitution;
    this.terrainUrl = undefined;

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
     * Array of 3D tiles set used for buildings/vegetation
     * @type {Array<Cesium.Cesium3DTileset>}
     */
    this.tilesets3d = [];

    this.previous_2D_layers = [];

    this.tree3D = {};
    this.appThemes_ = appThemes;

    this.zoomLevelTimer;

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
    this.activeTiles3dLayersPreload_ = [];

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

    this.mapStore_ = useMapStore();

    const { layers_3d } = storeToRefs(this.mapStore_)
    watch(
      layers_3d,
      (layers_3d, oldLayers_3d) => {
        const addedLayers = layers_3d.filter((el) => !oldLayers_3d.includes(el))
        const removedLayers = oldLayers_3d.filter((el) => !layers_3d.includes(el))
        addedLayers.forEach((layer) => this.add3dTile(layer));
        removedLayers.forEach((layer) => this.remove3dLayer(layer, true));
      }
    )

  }

  /**
   * @override
   */
  instantiateOLCesium() {
    console.assert((this.map !== null) && (this.map !== undefined));
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
    if (this.terrainUrl !== undefined) {
      this.defineTerrain(ol3d);
    }
    return ol3d;
  }

  setTerrain(url) {
    if (url === undefined) {
      url = "https://acts3.geoportail.lu/3d-data/3d-tiles/terrain3D/lidar_2019_terrain/3DTiles";
    }
    const isIpv6 = location.search.includes('ipv6=true');
    if (isIpv6) {
      url = url.replace(this.ipv6Substitution_.regularServerRoot, this.ipv6Substitution_.ipv6ServerRoot);
    }
    this.terrainUrl = url;
    // try setting a terrain provider - this call fails if Cesium is not yet loaded
    try {
      this.defineTerrain(this.ol3d);
    }
    catch(e) {}
  }

  defineTerrain(ol3d) {
    if (!this.ngeoLocation_.hasParam('no_terrain')) {
      // for performance, limit terrain levels to be loaded
      const unparsedTerrainLevels = this.ngeoLocation_.getParam('terrain_levels');
      const availableLevels = unparsedTerrainLevels ? unparsedTerrainLevels.split(',').map(e => parseInt(e, 10)) : undefined;
      const rectangle = this.getCameraExtentRectangle();
      const url = this.terrainUrl
      this.terrainProvider = new Cesium.CesiumTerrainProvider({rectangle, url, availableLevels});
      this.noTerrainProvider = new Cesium.EllipsoidTerrainProvider({});
      const scene = ol3d.getCesiumScene();
      // prevent rendering of parts of 3D objects hidden by terrain
      scene.globe.depthTestAgainstTerrain = true;
      scene.terrainProvider = this.TerrainProvider;
    }
  }

  setTree(tree) {
    this.tree3D = tree;
    let allCh = this.appThemes_.getAllChildren_(tree.children, tree, []);
    allCh.forEach(el => {
      this.addAvailableLayers(el);
      if (this.activeTiles3dLayersPreload_.includes(el.layer)) {
        this.add3dTile(el);
      }
    });
    this.activeTiles3dLayersPreload_ = [];
  }

  addAvailableLayers(layer) {
    if (this.availableTiles3dLayers_.map(x => x.id).indexOf(layer.id) < 0) {
      this.availableTiles3dLayers_.push(layer);
    }
  }

  init3dTilesFromLocation() {

    this.setMode('3D');

    const layers_3d = this.ngeoLocation_.getParam('3d_layers');

    if (layers_3d) {
      // the memorization of preload 3D layers is needed because tree/theme loading and 3D activation from
      // URL parameters are asynchronous and it is not deterministic which one is ready first
      this.activeTiles3dLayersPreload_ = layers_3d.split(',');
      this.availableTiles3dLayers_.filter(l => this.activeTiles3dLayersPreload_.includes(l.layer)).forEach(l => this.add3dTile(l));
    }
    this.scheduleMinimumZoomDistanceUpdate()
    this.ol3d.getCesiumScene().terrainProvider = this.terrainProvider;
  }

  /***
   * Initialize 3D tiles layers (buildings/vegetation)
   * @param {boolean} visible Initial visibility of 3D tiles.
   */
  init3dMeshes() {
    this.availableTiles3dLayers_.filter(e => this.isDefaultMeshLayer(e)).forEach(this.add3dTile.bind(this));
  }
  init3dTiles() {
    this.availableTiles3dLayers_.filter(e => this.isDefault3dDataLayer(e)).forEach(this.add3dTile.bind(this));
  }

  isMeshLayer(layer) {
    return layer.metadata.ol3d_type === 'mesh';
  }
  getActiveMeshLayers() {
    return this.activeTiles3dLayers_.map(
      lName => this.availableTiles3dLayers_.find(l => l.layer === lName)
    ).filter(l => this.isMeshLayer(l));
  }
  removeMeshLayers() {
    this.getActiveMeshLayers().forEach(l => {
      this.remove3dLayer(l)
    });
  }

  getActive3dLayers() {
    return this.activeTiles3dLayers_.map(
      lName => this.availableTiles3dLayers_.find(l => l.layer === lName)
    );
  }

  getWrappedActive3dLayers() {
    return this.getActive3dLayers().map(
      l => new Wrap3dLayer(l)
    );
  }

  isDefault3dDataLayer(layer) {
    const isData = layer.metadata.ol3d_type === 'data';
    const isDefault = layer.metadata.ol3d_defaultlayer === true;
    const isDefaultData = (layer.metadata.ol3d_type === 'data') && (layer.metadata.ol3d_defaultlayer === true);
    return (layer.metadata.ol3d_type === 'data') && (layer.metadata.ol3d_defaultlayer === true);
  }

  isDefaultMeshLayer(layer) {
    return (layer.metadata.ol3d_type === 'mesh') && (layer.metadata.ol3d_defaultlayer === true);
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

  add3dTile(layer) {
    let layerName = layer.layer
    if (this.activeTiles3dLayers_.indexOf(layerName) >= 0) {
      return;
    }
    this.activeTiles3dLayers_.push(layerName);
    this.mapStore_.add3dLayers(layer)
    this.ngeoLocation_.updateParams({'3d_layers': this.activeTiles3dLayers_.join(',')});
    let base_url = layer.url;
    // TODO set ipv6 url for IOS
    const url = base_url + '/' + layerName + '/tileset.json';
    // Magic numbers are based on example at https://cesium.com/docs/cesiumjs-ref-doc/Cesium3DTileset.html and optimised for wintermesh layer.
    const cs3d_options = {
      url: url,
      skipLevelOfDetail: true,
      baseScreenSpaceError: 623,
      skipScreenSpaceErrorFactor: 8,
      skipLevels: 1,
      loadSiblings: true,
      cullWithChildrenBounds: true,
      // dynamicScreenSpaceErrorDensity: 10,
      // dynamicScreenSpaceErrorFactor: 1,
      dynamicScreenSpaceError: true
    };
    if (layer.metadata.ol3d_options !== undefined) {
      Object.assign(cs3d_options, layer.metadata.ol3d_options);
    }
    var heightOffset = 0;
    var longOffset = 0;
    var latOffset = 0;
    // var terrainProvider = this.terrainProvider;
    if (cs3d_options.heightOffset !== undefined) {
      heightOffset = cs3d_options.heightOffset;
      delete cs3d_options.heightOffset;
    }
    if (cs3d_options.longOffset !== undefined) {
      longOffset = cs3d_options.longOffset;
      delete cs3d_options.longOffset;
    }
    if (cs3d_options.latOffset !== undefined) {
      latOffset = cs3d_options.latOffset;
      delete cs3d_options.latOffset;
    }
    if (cs3d_options.minimumZoomDistance !== undefined) {
      // remove custom option unknown by Cesium
      delete cs3d_options.minimumZoomDistance;
    }
    //if (cs3d_options.noTerrainProvider !== undefined || this.isMeshLayer(layer)) {
    // if (this.isMeshLayer(layer)) {
    //   terrainProvider = this.noTerrainProvider;
    // }

    const tileset = new Cesium.Cesium3DTileset(cs3d_options);

    this.tilesets3d.push(tileset);
    this.ol3d.getCesiumScene().primitives.add(tileset);
    // Adjust a tileset's height from the globe's surface.
    const scene = this.ol3d.getCesiumScene();
    // scene.terrainProvider = terrainProvider;
    scene.terrainProvider = this.terrainProvider;

    if ((heightOffset != 0) || (longOffset != 0) || (latOffset != 0)) {
      tileset.readyPromise.then(function(tileset) {
        const boundingSphere = tileset.boundingSphere;
        const cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);

        const surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);
        const offset = Cesium.Cartesian3.fromRadians(cartographic.longitude + longOffset,
                                                     cartographic.latitude + latOffset,
                                                     heightOffset);
        const translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
        tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
      }).otherwise(function(error) {
        console.log(error);
      });
    }

    this.scheduleMinimumZoomDistanceUpdate()

    if (this.isMeshLayer(layer) && (this.getMode() !== 'MESH')) {
      this.setMode("MESH");
      // prevent the mesh from being hidden by parts of the (blank/white) terrain
      scene.globe.depthTestAgainstTerrain = false;
      this.disable_2D_layers_and_terrain()
    }

    /** @type {ngeox.BackgroundEvent} */
    const event = new ngeoCustomEvent('add', {
      newLayer: new Wrap3dLayer(layer)
    });
    this.dispatchEvent(event);
  }

  remove3dLayer(layer, checkNoMeshes = true) {
    const layerName = layer.layer
    const idx = this.activeTiles3dLayers_.indexOf(layerName);
    this.mapStore_.removeLayers(layer.id)
    if (idx >= 0) {
      let removedTilesets = this.tilesets3d.splice(idx, 1);
      this.activeTiles3dLayers_.splice(idx, 1);
      this.ngeoLocation_.updateParams({'3d_layers': this.activeTiles3dLayers_.join(',')});
      this.ol3d.getCesiumScene().primitives.remove(removedTilesets[0]);
    }
    if (checkNoMeshes && (this.getMode() === 'MESH') && (this.getActiveMeshLayers().length === 0)) {
      this.setMode('3D');
      this.onToggle(false);
      const msg = this.gettextCatalog.getString(
        '3D Mesh mode has been deactivated because ' +
          'all mesh layers have been deselected.')
      this.notify_(msg, appNotifyNotificationType.WARNING);
    }
    this.scheduleMinimumZoomDistanceUpdate()
  }

  toggleLayer(layer) {
    let layerName = layer.layer
    if (this.activeTiles3dLayers_.indexOf(layerName) >= 0) {
      this.remove3dLayer(layer.layer);
    } else {
      if (this.isMeshLayer(layer) && (this.getMode() !== 'MESH')) {
        this.toggleMesh(false);
      }
      this.add3dTile(layer);
    }
  }

  getMinZoomDistanceFromLayer(layer) {
    const opt = layer.metadata.ol3d_options;
    if ((opt !== undefined) && (opt.minimumZoomDistance !== undefined)) {
      return opt.minimumZoomDistance;
    } else {
      return this.isMeshLayer(layer) ? 50 : 5;
    }
  }

  scheduleMinimumZoomDistanceUpdate() {
    if (this.zoomLevelTimer) {
      clearTimeout(this.zoomLevelTimer);
    }
    // delay min zoom calculation because loading of multiple layers or exclusion rules would lead to
    // multiple computation
    this.zoomLevelTimer = setTimeout(this.updateMinimumZoomDistance, 50, this);
  }

  updateMinimumZoomDistance(parentScope) {
    if (!parentScope.is3dEnabled()) return;
    const layers = parentScope.getActive3dLayers()
    // default min zoom for mesh : 50m, for 3d: 5m (unless overridden in metadata)
    const defaultMinimumZoomDistance = (parentScope.getMode() === "MESH") ? 50 : 5;

    const minZoomDistance = Math.max(
      defaultMinimumZoomDistance,
      ...layers.map(l => parentScope.getMinZoomDistanceFromLayer(l))
    );
    const scene = parentScope.ol3d.getCesiumScene();
    scene.screenSpaceCameraController.minimumZoomDistance = minZoomDistance;
    var height = scene.globe.ellipsoid.cartesianToCartographic(scene.camera.position).height;
    var groundLevel = scene.globe.getHeight(Cesium.Cartographic.fromCartesian(scene.camera.position));
    // const cameraPos = Cesium.Cartographic.fromCartesian(scene.camera.position);
    // const ground2H = scene.globe.getHeight(new Cesium.Cartographic(cameraPos.longitude, cameraPos.latitude, 0));
    var relativeHeight = height - groundLevel;
    if (relativeHeight  < minZoomDistance) {
      const unitHeightDiff = height - scene.globe.ellipsoid.cartesianToCartographic(
        Cesium.Cartesian3.add(scene.camera.position, scene.camera.direction, new Cesium.Cartesian3())
      ).height;
      // set limit angle to not move too far back in order to move up sufficienty
      // min angle in radians : alpha ~ sin(alpha)
      const minAngle = 0.25;
      const distToMoveUp = minZoomDistance - relativeHeight;
      const destPosition = new Cesium.Cartesian3();
      const vectorToMove = new Cesium.Cartesian3()
      if (unitHeightDiff < minAngle) {
        // move back
        Cesium.Cartesian3.multiplyByScalar(scene.camera.direction, -distToMoveUp / minAngle, vectorToMove);
        Cesium.Cartesian3.add(scene.camera.position, vectorToMove, destPosition);
        // move up
        Cesium.Cartesian3.multiplyByScalar(scene.camera.up, distToMoveUp * (1 - unitHeightDiff / minAngle), vectorToMove);
        Cesium.Cartesian3.add(destPosition, vectorToMove, destPosition);
      } else {
        // move back
        Cesium.Cartesian3.multiplyByScalar(scene.camera.direction, -distToMoveUp / unitHeightDiff, vectorToMove);
        Cesium.Cartesian3.add(scene.camera.position, vectorToMove, destPosition);
      }
      height = scene.globe.ellipsoid.cartesianToCartographic(destPosition).height;
      groundLevel = scene.globe.getHeight(Cesium.Cartographic.fromCartesian(destPosition));
      relativeHeight = height - groundLevel;
      // if terrain is hit when moving backwards, move up again
      if (relativeHeight  < minZoomDistance) {
        // move up sufficiently above terrain
        Cesium.Cartesian3.multiplyByScalar(scene.camera.up, minZoomDistance - relativeHeight, vectorToMove);
        Cesium.Cartesian3.add(destPosition, vectorToMove, destPosition);
      }
      scene.camera.flyTo({destination: destPosition, orientation: {direction: scene.camera.direction, up: scene.camera.up}});
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

  remove3DLayers(checkNoMeshes = true) {
    this.availableTiles3dLayers_.forEach(function(layer) {
      this.remove3dLayer(layer, checkNoMeshes);
    }.bind(this));
  }

  disable_2D_layers_and_terrain() {
    // prevent the mesh from being hidden by parts of the (blank/white) terrain
    this.ol3d.getCesiumScene().globe.depthTestAgainstTerrain = false;
    if (this.currentBgLayer === undefined) {
      this.currentBgLayer = this.mapStore_.bgLayer;
      this.disable_2D_layers();
      this.mapStore_.bgLayer = null;
    }
  }

  restore_2D_layers_and_terrain() {
    // prevent rendering of parts of 3D objects hidden by terrain
    this.ol3d.getCesiumScene().globe.depthTestAgainstTerrain = true;
    this.restore_2D_layers_and_background();
  }

  restore_2D_layers_and_background() {
    if (this.currentBgLayer !== undefined && this.currentBgLayer !== null) {
      this.mapStore_.bgLayer = this.currentBgLayer;
      this.currentBgLayer = undefined;
    }
    this.restore_2D_layers();
  }

  disable_2D_layers() {
    // push all active 2D layers into this.previous_2D_layers and deactivate them
    this.previous_2D_layers = [...this.mapStore_.layers]
    this.mapStore_.removeAllLayers()
  }

  restore_2D_layers() {
    this.mapStore_.addLayers(...this.previous_2D_layers);
    this.previous_2D_layers = [];
  }

  onToggle(doInit) {
    if (this.is3dEnabled()) {
      this.mapStore_.is_3d_active = true
      if (this.mode_ === 'MESH') {
        this.mapStore_.is_3d_mesh = true
        this.disable_2D_layers_and_terrain();
        if (doInit) {
          this.remove3DLayers(false);
        }
        if (this.getActiveMeshLayers().length == 0) {
          this.init3dMeshes();
        }
      } else {
        this.mapStore_.is_3d_mesh = false
        this.restore_2D_layers_and_terrain();
        this.removeMeshLayers();
        const scene = this.ol3d.getCesiumScene();
        // scene.terrainProvider = this.TerrainProvider;
        if (doInit) {
          this.remove3DLayers();
        }
        this.init3dTiles();
      }
      this.scheduleMinimumZoomDistanceUpdate()
    } else {
      this.mapStore_.is_3d_active = false
      this.restore_2D_layers_and_background();
      this.remove3DLayers(false);
      this.ngeoLocation_.deleteParam('3d_layers');
    }
  }

  toggleMesh(doInit = true) {
    if ((this.getMode() === '3D') && this.is3dEnabled()) {
      this.setMode('MESH');
      this.onToggle(false);
    } else {
      this.toggleMode('MESH', doInit);
    }
  }
  toggle3dTerrain() {
    if ((this.getMode() === 'MESH') && this.is3dEnabled()) {
      this.setMode('3D');
      this.onToggle(false);
    } else {
      this.toggleMode('3D');
    }
  }
  toggleMode(mode, doInit = true) {
    this.setMode(mode);
    this.toggle3d().then(function() {
      this.onToggle(doInit);
    }.bind(this));
  }

  is3dTerrainEnabled() {
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
