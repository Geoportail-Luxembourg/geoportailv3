goog.provide('lux.MapBoxLayer');

goog.require('ol.layer.Layer');
goog.require('ol.math');
goog.require('ol.proj');

goog.require('ol.renderer.canvas.Layer');


class MapBoxLayerRenderer extends ol.renderer.canvas.Layer {

  /**
   * @param {MapBoxLayer} layer .
   */
  constructor(layer) {
    super();
    this.layer = layer;
  }

  /**
   * Determine if this renderer handles the provided layer.
   * @param {*} _ .
   * @param {ol.layer.Layer} layer The candidate layer.
   * @return {boolean} The renderer can render the layer.
   * @export
   */
  static handles(_, layer) {
    return layer instanceof lux.MapBoxLayer;
  }

  /**
   * Create a layer renderer.
   * @param {ol.Map} _ The map renderer.
   * @param {ol.layer.Layer} layer The layer to be rendererd.
   * @return {MapBoxLayerRenderer} The layer renderer.
   * @export
   */
  static create(_, layer) {
    return new MapBoxLayerRenderer(/** @type {MapBoxLayer} */ (layer));
  }

  /**
   * Called by the OpenLayer renderer on render if the layer is visible.
   * @param {ol.PluggableMap.FrameState} frameState .
   * @override
   */
  prepareFrame(frameState) {
    const layer = this.layer;

    // Eventually initialze the MapBox map.
    const map = layer.getMapBoxMap();

    const canvas = map['getCanvas']();
    const opacity = layer.getOpacity().toString();
    if (opacity !== canvas.style.opacity) {
      canvas.style.opacity = opacity;
    }

    // Adjust view parameters in mapbox
    const viewState = frameState.viewState;
    const rotation = viewState.rotation || 0;
    map['jumpTo']({
      'bearing': ol.math.toDegrees(-rotation),
      // Note: Mapbox GL uses longitude, latitude coordinate order (see https://docs.mapbox.com/mapbox-gl-js/api/).
      'center': ol.proj.toLonLat(viewState.center),
      'zoom': viewState.zoom - 1,
      'animate': false
    });

    this.triggerSynchronousMapboxRendering_(map);
  }

  /**
   * Cancel the scheduled update and trigger a synchronous redraw
   * using some private APIs: this MIGHT BREAK in a future MapBox version!
   * See https://github.com/mapbox/mapbox-gl-js/issues/7893#issue-408992184
   * @param {mapboxgl.Map} map .
   */
  triggerSynchronousMapboxRendering_(map) {

    if (map['_frame']) {
      map['_frame']['cancel']();
      map['_frame'] = null;
    }
    map['_render']();
  }
}

lux.MapBoxLayer = class MapBoxLayer extends ol.layer.Layer {

  constructor(options) {

    const baseOptions = Object.assign({}, options);

    delete baseOptions['accessToken'];
    delete baseOptions['style'];
    delete baseOptions['container'];
    super(baseOptions);

    if (options.accessToken) {
      window['mapboxgl']['accessToken'] = options['accessToken'];
    }

    this.container_ = options['container'];
    this.style_ = options['style'];
    this.xyz_ = options['xyz'];

    /**
     * @type {mapboxgl.Map}
     */
    this.mapboxMap = null;

    // this.getMapBoxMap();
    this.on('change:visible', evt => {
      this.updateVisibility_();
    });
  }


  /**
   * @override
   */
  getType() {
    return 'GEOBLOCKS_MVT';
  }

  getXYZ() {
    return this.xyz_;
  }

  /**
   * @return {!mapboxgl.Map} The lazily initialized map
   */
  getMapBoxMap() {
    if (!this.mapboxMap) {
      this.mapboxMap = new window['mapboxgl']['Map']({
        'container': this.container_,
        'style': this.style_,
        'attributionControl': false,
        'boxZoom': false,
        'doubleClickZoom': false,
        'dragPan': false,
        'dragRotate': false,
        'interactive': false,
        'keyboard': false,
        'pitchWithRotate': false,
        'scrollZoom': false,
        'touchZoomRotate': false
      });
      this.updateVisibility_();
    }
    return this.mapboxMap;
  }

  updateVisibility_() {
    const map = this.getMapBoxMap();
    const visible = this.getVisible();
    const visibility = visible ? 'block' : 'none';
    const canvas = map['getCanvas']();
    if (canvas.style.display !== visibility) {
      canvas.style.display = visibility;
    }
  }

  getSourceState() {
    return 'ready';
  }

  /**
   * Change visibility of a sublayer.
   * @param {string} layername .
   * @param {boolean} visible .
   */
  setLayerVisibility(layername, visible) {
    this.mapboxMap.setLayoutProperty(layername, 'visibility', visible ? 'visible' : 'none');
  }
};

lux.MapBoxLayer.MapBoxLayerRenderer = MapBoxLayerRenderer;
window.MapBoxLayerRenderer = MapBoxLayerRenderer;
