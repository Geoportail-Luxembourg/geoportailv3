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

    /**
     * @const {ol.Extent}
     */
    this.cameraExtentInRadians = cameraExtentInRadians;
  }


  /**
   * @override
   */
  configureForUsability(scene) {
    super.configureForUsability(scene);
    const camera = scene.camera;
    camera.constrainedAxisAngle = 7 * Math.PI / 16; // almost PI/2

    // for performance, limit terrain levels to be loaded
    const availableLevels = [8, 11, 14, 16, 17];
    const rectangle = this.getCameraExtentRectangle();
    const url = this.ngeoLocation_.hasParam('own_terrain') ?
      'https://3dtiles.geoportail.lu/tiles' :
      'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles';
    scene.terrainProvider = new Cesium.CesiumTerrainProvider({
      rectangle,
      url,
      availableLevels});
  }
};
