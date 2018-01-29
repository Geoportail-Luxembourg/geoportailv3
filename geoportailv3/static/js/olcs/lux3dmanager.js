goog.provide('app.olcs.Lux3DManager');

goog.require('ngeo.olcs.Manager');


app.olcs.Lux3DManager = class extends ngeo.olcs.Manager {
  /**
   *
   * @param {string} cesiumUrl Cesium URL.
   * @param {ol.Extent} cameraExtentInRadians The Luxembourg extent.
   * @param {ol.Map} map The map.
   * @param {ngeo.Location} ngeoLocation The location service.
   * @param {angular.Scope} $rootScope The root scope.
   */
  constructor(cesiumUrl, cameraExtentInRadians, map, ngeoLocation, $rootScope) {
    super(cesiumUrl, $rootScope, {
      map,
      cameraExtentInRadians
    });

    /**
     * @private
     * @type {ngeo.Location}
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
  }

  /**
   * @override
   */
  instantiateOLCesium() {
    goog.asserts.assert(this.map);
    const terrainExaggeration = parseFloat(this.ngeoLocation_.getParam('terrain_exaggeration') || '1.5');

    const sceneOptions = /** @type {!Cesium.SceneOptions} */ ({terrainExaggeration});
    const ol3d = new olcs.OLCesium({map: this.map, sceneOptions});

    const scene = ol3d.getCesiumScene();

    if (this.ngeoLocation_.hasParam('tile_coordinates')) {
      scene.imageryLayers.addImageryProvider(new Cesium['TileCoordinatesImageryProvider']());
    }

    // for performance, limit terrain levels to be loaded
    const unparsedTerrainLevels = this.ngeoLocation_.getParam('terrain_levels');
    const availableLevels = unparsedTerrainLevels ? unparsedTerrainLevels.split(',').map(e => parseInt(e, 10)) : undefined;
    const rectangle = this.getCameraExtentRectangle();
    const url = this.ngeoLocation_.hasParam('own_terrain') ?
      'https://3dtiles.geoportail.lu/tiles' :
      'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles';
    scene.terrainProvider = new Cesium.CesiumTerrainProvider({rectangle, url, availableLevels});
    return ol3d;
  }

  /**
   * @override
   */
  configureForUsability(scene) {
    super.configureForUsability(scene);
    const camera = scene.camera;
    camera.constrainedAxisAngle = 7 * Math.PI / 16; // almost PI/2
  }
};
