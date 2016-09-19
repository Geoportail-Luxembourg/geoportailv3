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
 * Array of opacities for the layers.
 * @type {Array<number>}
 */
luxx.MapOptions.prototype.layerOpacities;

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
 * Set the presence of a layer manager control. (not included by default)
 * @type {luxx.LayerManagerOptions|undefined}
 */
luxx.MapOptions.prototype.layerManager;

/**
 * Set the presence of a mouse position control in the map. (not included by
 * default).
 * @type {luxx.MousePositionOptions}
 */
luxx.MapOptions.prototype.mousePosition;

/**
 * Set the presence of features to recenter on & to show markers for.
 * (not included by default).
 * @type {luxx.FeaturesOptions}
 */
luxx.MapOptions.prototype.features;

/**
 * Set the presence of a background selector control in the map.
 * (not included by default).
 * @type {luxx.BgSelectorOptions}
 */
luxx.MapOptions.prototype.bgSelector;


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
 * The projection of the position coordinates.
 * Default is `2169`.
 * @type {string|number}
 */
luxx.MarkerOptions.prototype.positionSrs;


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
 * @type {luxx.LayerMetadataOptions}
 */
luxx.LayerOptions.prototype.metadata;

/**
 * @type {string}
 */
luxx.LayerOptions.prototype.imageType;

/**
 * @type {string}
 */
luxx.LayerOptions.prototype.type;

/**
 * @type {boolean}
 */
luxx.LayerOptions.prototype.isBgLayer;

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

/**
 * Object literal with config options for the bgSelector control.
 * @typedef {Object}
 */
luxx.BgSelectorOptions;

/**
 * The container for the bgSelector control, either the element itself or
 * the `id` of the element.
 * @type {Element|string}
 */
luxx.BgSelectorOptions.prototype.target;

/**
 * Object literal with config options for the layer manager control.
 * @typedef {Object}
 */
luxx.LayerManagerOptions;

/**
 * The container for the layer manager control, either the element itself or
 * the `id` of the element.
 * @type {Element|string}
 */
luxx.LayerManagerOptions.prototype.target;

/**
 * @typedef {Object.<string, Array.<number>>}
 */
luxx.Exclusions;

/**
 * @typedef {Object}
 */
luxx.LayerMetadataOptions;

/**
 * @type {string}
 */
luxx.LayerMetadataOptions.prototype.exclusion;

/**
 * @typedef {Object}
 */
luxx.MyMapOptions;

/**
 * @type {string}
 */
luxx.MyMapOptions.prototype.mapId;

/**
 * @type {string|undefined}
 * The id of the element in which to put the profile (without #). Optional. It
 * is recommended to set the display style to none at first. The display will
 * then be set to block adequately.
 */
luxx.MyMapOptions.prototype.profileTarget;

/**
 * @type {function(Array<ol.Feature>)|undefined}
 * The function called once the map is loaded. Optional.
 */
luxx.MyMapOptions.prototype.onload;

/**
 * Object literal with config options for the feature recenter.
 * @typedef {Object}
 */
luxx.FeaturesOptions;


/**
 * Comma-separated list of ids.
 * @type {Array<string>}
 */
luxx.FeaturesOptions.prototype.ids;

/**
 * Layer identifier
 * @type {string|number}
 */
luxx.FeaturesOptions.prototype.layer;

/**
 * Object literal with config options for the vector (GPX/KML) layer.
 * @typedef {Object}
 */
luxx.VectorOptions;

/**
 * Interval after which to relaod the vector layer (in seconds).
 * @type {number}
 */
luxx.VectorOptions.prototype.reloadInterval;

/**
 * The style function.
 * @type {ol.style.StyleFunction}
 */
luxx.VectorOptions.prototype.style;

/**
 * @typedef {Object}
 */
luxx.State;

/**
 * @type {number}
 */
luxx.State.prototype.X;

/**
 * @type {number}
 */
luxx.State.prototype.Y;

/**
 * @type {number}
 */
luxx.State.prototype.zoom;

/**
 * @type {Array<number>}
 */
luxx.State.prototype.layers;

/**
 * @type {Array<number>}
 */
luxx.State.prototype.opacities;

/**
 * @type {string}
 */
luxx.State.prototype.bgLayer;

/**
 * @typedef {Object}
 */
luxx.GeocodeOptions;

/**
 * @type {number}
 */
luxx.GeocodeOptions.prototype.num;

/**
 * @type {string}
 */
luxx.GeocodeOptions.prototype.street;

/**
 * @type {number}
 */
luxx.GeocodeOptions.prototype.zip;

/**
 * @type {string}
 */
luxx.GeocodeOptions.prototype.locality;

/**
 * @typedef {Object}
 */
luxx.GeocodeResult;

/**
 * @type {number}
 */
luxx.GeocodeResult.prototype.easting;

/**
 * @type {number}
 */
luxx.GeocodeResult.prototype.northing;

/**
 * @typedef {Object}
 */
luxx.ReverseGeocodeResponse;

/**
 * @type {number}
 */
luxx.ReverseGeocodeResponse.prototype.count;

/**
 * @type {Array<Object>}
 */
luxx.ReverseGeocodeResponse.prototype.results;
