goog.provide('app.print.Printservice');

goog.require('ngeo.print.Service');
goog.require('ol.array');
goog.require('ol.obj');
goog.require('ol.math');


app.print.Printservice = class extends ngeo.print.Service {
  /**
   * @param {string} url URL to MapFish print web service.
   * @param {angular.$http} $http Angular $http service.
   * @param {ngeo.map.LayerHelper} ngeoLayerHelper Ngeo Layer Helper service.
   */
  constructor(url, $http, ngeoLayerHelper) {
    super(url, $http, ngeoLayerHelper);
    /**
     * @type {ngeo.map.LayerHelper}
     * @private
     */
    this.ngeoLayerHelper2_ = ngeoLayerHelper;

  }
  /**
   * @override
   */
  createSpec(map, scale, dpi, layout, format, customAttributes) {

    const specMap = /** @type {MapFishPrintMap} */ ({
      dpi: dpi,
      rotation: /** number */ (customAttributes['rotation'])
    });

    this.encodeMap2_(map, scale, specMap);

    const attributes = /** @type {!MapFishPrintAttributes} */ ({
      map: specMap
    });
    ol.obj.assign(attributes, customAttributes);

    const spec = /** @type {MapFishPrintSpec} */ ({
      attributes,
      format,
      layout
    });

    return spec;
  }

  /**
   * @param {ol.Map} map Map.
   * @param {number} scale Scale.
   * @param {MapFishPrintMap} object Object.
   * @private
   */
  encodeMap2_(map, scale, object) {
    const view = map.getView();
    const viewCenter = view.getCenter();
    const viewProjection = view.getProjection();
    const viewResolution = view.getResolution();
    const viewRotation = object.rotation || ol.math.toDegrees(view.getRotation());

    goog.asserts.assert(viewCenter !== undefined);
    goog.asserts.assert(viewProjection !== undefined);

    object.center = viewCenter;
    object.projection = viewProjection.getCode();
    object.rotation = viewRotation;
    object.scale = scale;
    object.layers = [];

    const mapLayerGroup = map.getLayerGroup();
    goog.asserts.assert(mapLayerGroup);

    let layers = this.ngeoLayerHelper2_.getFlatLayers(mapLayerGroup);
    ol.array.stableSort(layers, (layer_a, layer_b) => layer_a.getZIndex() - layer_b.getZIndex());
    layers = layers.slice().reverse();

    layers.forEach((layer) => {
      if (layer.getVisible()) {
        goog.asserts.assert(viewResolution !== undefined);
        this.encodeLayer(object.layers, layer, viewResolution);
      }
    });
  }
};
