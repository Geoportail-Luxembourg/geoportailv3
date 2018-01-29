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

    if (ngeoLocation.hasParam('fog_sse_factor')) {
      this.fogSSEFactor = parseFloat(ngeoLocation.getParam('fog_sse_factor'));
    }

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
