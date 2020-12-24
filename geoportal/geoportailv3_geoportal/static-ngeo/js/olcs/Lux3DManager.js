/**
 * @module app.olcs.Lux3DManager
 */
import ngeoOlcsManager from 'ngeo/olcs/Manager.js';

import OLCesium from 'olcs/OLCesium.js'
import LuxRasterSynchronizer from './LuxRasterSynchronizer';
import VectorSynchronizer from 'olcs/VectorSynchronizer';
//import VectorSynchronizer from 'olcs/Mvt';

const exports = class extends ngeoOlcsManager {
  /**
   *
   * @param {string} cesiumUrl Cesium URL.
   * @param {ol.Extent} cameraExtentInRadians The Luxembourg extent.
   * @param {ol.Map} map The map.
   * @param {ngeo.statemanager.Location} ngeoLocation The location service.
   * @param {angular.Scope} $rootScope The root scope.
   * @param {Array<string>} tiles3dLayers 3D tiles layers.
   * @param {string} tiles3dUrl 3D tiles server url.
   */
  constructor(cesiumUrl, cameraExtentInRadians, map, ngeoLocation, $rootScope,
              tiles3dLayers, tiles3dUrl) {
    super(cesiumUrl, $rootScope, {
      map,
      cameraExtentInRadians
    });

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
    this.availableTiles3dLayers_ = tiles3dLayers;

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
  }

  /**
   * @override
   */
  instantiateOLCesium() {
    console.assert(this.map !== null && this.map !== undefined);
    const terrainExaggeration = parseFloat(this.ngeoLocation_.getParam('terrain_exaggeration') || '1.0');

    const sceneOptions = /** @type {!Cesium.SceneOptions} */ ({terrainExaggeration});
    const map = /** @type {!ol.Map} */ (this.map);
    const niceIlluminationDate = Cesium.JulianDate['fromDate'](new Date('June 21, 2018 12:00:00 GMT+0200'));
    const time = () => niceIlluminationDate;
    function createSynchronizers(map, scene) {
      return [
        new LuxRasterSynchronizer(map, scene),
        new VectorSynchronizer(map, scene),
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
    const domain = (isIpv6) ? "app.geoportail.lu" : "geoportail.lu";

    const url = terrainToDisplay === 'own' ?
      'https://3dtiles.' + domain + '/tiles' :
      'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles';
    if (!this.ngeoLocation_.hasParam('no_terrain')) {
      scene.terrainProvider = new Cesium.CesiumTerrainProvider({rectangle, url, availableLevels});
    }
    // limit the scene minimum zoom to 
    scene.screenSpaceCameraController.minimumZoomDistance=150


    return ol3d;
  }

  /***
   * Initialize 3D tiles layers (buildings/vegetation)
   * @param {boolean} visible Initial visibility of 3D tiles.
   */
  init3dTiles(visible) {
    this.availableTiles3dLayers_.filter(e => e.show).map(e => e.name).forEach(this.add3dTile.bind(this))
  }

  /**
   * Change 3D tiles layers visibility
   * @param {boolean} visible Visibility.
   */
  set3dTilesetsVisible(visible) {
    this.tilesets3d.forEach(tileset => tileset.show = visible);
  }

  set3dTilesetVisible(visible, layerName) {
    const tileset = this.tilesets3d.find((e) => e.url.includes(layerName));
    tileset.show = visible;
  }

  add3dTile(layerName) {
    this.activeTiles3dLayers_.push(layerName);
    const url = this.tiles3dUrl_ + layerName + "/tileset.json";
    // Magic numbers are based on example at https://cesium.com/docs/cesiumjs-ref-doc/Cesium3DTileset.html and optimised for wintermesh layer.
    const tileset = new Cesium.Cesium3DTileset({
      url: url,
      skipLevelOfDetail: true,
      baseScreenSpaceError : 1024,
      skipScreenSpaceErrorFactor : 16,
      skipLevels : 1,
      immediatelyLoadDesiredLevelOfDetail : false,
      cullWithChildrenBounds : true
    });
    this.tilesets3d.push(tileset);
    this.ol3d.getCesiumScene().primitives.add(tileset);
  }
  remove3dLayer(layerName) {
    const layer = this.tilesets3d.find(e => e.url.includes(layerName));
    const idx = this.tilesets3d.findIndex(e => e.url.includes(layerName));
    this.tilesets3d.splice(idx, 1)
    this.activeTiles3dLayers_.splice(idx, 1)
    this.ol3d.getCesiumScene().primitives.remove(layer)
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
   * @export
   */
  getAvailableLayerName() {
    return this.availableTiles3dLayers_.map(e => e.name)
  }

  getActiveLayerName() {
    return this.activeTiles3dLayers_
  }
};


export default exports;
