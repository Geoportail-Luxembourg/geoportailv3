goog.provide('app.olcs.Lux3DManager');

goog.require('ngeo.olcs.Manager');


app.olcs.Lux3DManager = class extends ngeo.olcs.Manager {
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
    this.tiles3dLayers_ = tiles3dLayers;

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
    const ol3d = new olcs.OLCesium({map, time, sceneOptions});

    const scene = ol3d.getCesiumScene();

    if (this.ngeoLocation_.hasParam('tile_coordinates')) {
      scene.imageryLayers.addImageryProvider(new Cesium['TileCoordinatesImageryProvider']());
    }

    // for performance, limit terrain levels to be loaded
    const unparsedTerrainLevels = this.ngeoLocation_.getParam('terrain_levels');
    const availableLevels = unparsedTerrainLevels ? unparsedTerrainLevels.split(',').map(e => parseInt(e, 10)) : undefined;
    const rectangle = this.getCameraExtentRectangle();
    const terrainToDisplay = this.ngeoLocation_.getParam('3d_terrain') || 'own';
    const url = terrainToDisplay === 'own' ?
      'https://3dtiles.geoportail.lu/tiles' :
      'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles';
    if (!this.ngeoLocation_.hasParam('no_terrain')) {
      scene.terrainProvider = new Cesium.CesiumTerrainProvider({rectangle, url, availableLevels});
    }

    return ol3d;
  }

  /***
   * Initialize 3D tiles layers (buildings/vegetation)
   * @param {boolean} visible Initial visibility of 3D tiles.
   */
  init3dTiles(visible) {
    const scene = this.ol3d.getCesiumScene();
    this.tiles3dLayers_.forEach((layer) => {
      const url = this.tiles3dUrl_ + layer;
      const tileset = new Cesium.Cesium3DTileset({
        url: url,
        maximumNumberOfLoadedTiles: 3,
        show: visible
      });
      this.tilesets3d.push(tileset);
      scene.primitives.add(tileset);
    });
  }

  /**
   * Change 3D tiles layers visibility
   * @param {boolean} visible Visibility.
   */
  set3dTilesetVisible(visible) {
    this.tilesets3d.forEach((tileset) => tileset.show = visible);
  }

  /**
   * @override
   */
  configureForUsability(scene) {
    super.configureForUsability(scene);
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
};
