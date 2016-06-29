/**
 * @type {Object}
 */
var luxx;

/**
 * Object literal with config options for the map.
 * @typedef {Object}
 */
luxx.MapOptions;

/**
 * Identifier of background layer. Default to `basemap_2015_global`.
 * @type {string}
 */
luxx.MapOptions.prototype.bgLayer;

/**
 * Array of overlay layer identifiers.
 * @type {Array<string>}
 */
luxx.MapOptions.prototype.layers;

/**
 * The container for the map, either the element itself or the `id` of the
 * element.
 * @type {Element|string}
 */
luxx.MapOptions.prototype.target;

/**
 * The initial position of the center for the map view. The coordinate system
 * for the center is specified with the `positionSrs` option.
 * @type {ol.Coordinate|undefined}
 */
luxx.MapOptions.prototype.position;

/**
 * The projection of the position coordinates.
 * Default is `2169`.
 * @type {string|number}
 */
luxx.MapOptions.prototype.positionSrs;

/**
 * Zoom level used to calculate the initial resolution for the view.
 * @type {number|undefined}
 */
luxx.MapOptions.prototype.zoom;

/**
 * Set the presence of a mouse position control in the map. (not included by
 * default).
 * @type {luxx.MousePositionOptions}
 */
luxx.MapOptions.prototype.mousePosition;

/**
 * Set the presence of a background selector control in the map.
 * (not included by default).
 * @type {ol.Coordinate|undefined}
 */
luxx.MapOptions.prototype.bgSelector;

/**
 * The container for the background selector, either the element itself or
 * the `id` of the element.
 * @type {Element|string}
 */
luxx.MapOptions.prototype.bgSelectorTarget;

/**
 * Object literal with config options for the maker.
 * @typedef {Object}
 */
luxx.MarkerOptions;


/**
 * Position of the marker. If not set, the marker is displayed at the center of
 * the map.
 * @type {ol.Coordinate|undefined}
 */
luxx.MarkerOptions.prototype.position;


/**
 * Tells whether the map should be recentered to the marker position.
 * @type {boolean|undefined}
 */
luxx.MarkerOptions.prototype.autoCenter;


/**
 * URL to an image.
 * Defaults to `http://openlayers.org/en/master/examples/data/icon.png`.
 * @type {string|undefined}
 */
luxx.MarkerOptions.prototype.iconURL;


/**
 * Positioning of the icon. See
 * {@link http://openlayers.org/en/latest/apidoc/ol.html#.OverlayPositioning}
 * @type {string|undefined}
 */
luxx.MarkerOptions.prototype.positioning;


/**
 * If set, HTML code or simple text that will be displayed when clicking on the
 * marker.
 * @type {string|undefined}
 */
luxx.MarkerOptions.prototype.html;


/**
 * If set, the popup is displayed when hovering the marker and is closed on
 * mouseout.
 * @type {boolean|undefined}
 */
luxx.MarkerOptions.prototype.hover;

/**
 * Object literal with config options for the layer.
 * @typedef {Object}
 */
luxx.LayerOptions;

/**
 * @type {string}
 */
luxx.LayerOptions.prototype.imageType;

/**
 * @type {string}
 */
luxx.LayerOptions.prototype.type;

/**
 * Object literal with config options for the layers.
 * @typedef {Object.<number|string, luxx.LayerOptions>}
 */
luxx.LayersOptions;

/**
 * Object literal with config options for the mouse position control.
 * @typedef {Object}
 */
luxx.MousePositionOptions;

 /**
 * The projection of the mouse position control.
 * Default is `2169`.
 * @type {string|number}
 */
luxx.MousePositionOptions.prototype.srs;

/**
 * The container for the mouse position control, either the element itself or
 * the `id` of the element.
 * @type {Element|string}
 */
luxx.MousePositionOptions.prototype.target;
