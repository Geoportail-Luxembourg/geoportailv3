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
 * Function called when the objects are initialized.
 * @type {function()|undefined}
 * @api
 */
luxx.MapOptions.prototype.callback;

/**
 * Identifier of background layer. Default to `basemap_2015_global`.
 * @type {string|undefined}
 * @api
 */
luxx.MapOptions.prototype.bgLayer;

/**
 * Set the presence of a background selector control in the map.
 * (not included by default).
 * @type {luxx.BgSelectorOptions|undefined}
 * @api
 */
luxx.MapOptions.prototype.bgSelector;

/**
 * Controls initially added to the map. If not specified,
 * {@link ol.control.defaults ol.control.defaults()} is used.
 * @type {ol.Collection.<ol.control.Control>|Array.<ol.control.Control>|undefined}
 * @api
 */
luxx.MapOptions.prototype.controls;

/**
 * Set the presence of features to recenter on & to show markers for.
 * (not included by default).
 * @type {luxx.FeaturesOptions|undefined}
 * @api
 */
luxx.MapOptions.prototype.features;

/**
 * Set the presence of a layer manager control. (not included by default)
 * @type {luxx.LayerManagerOptions|undefined}
 * @api
 */
luxx.MapOptions.prototype.layerManager;

/**
 * Array of opacities for the layers.
 * @type {Array<number>|undefined}
 * @api
 */
luxx.MapOptions.prototype.layerOpacities;

/**
 * Array of visibilities for the layers.
 * @type {Array<boolean>|undefined}
 * @api
 */
luxx.MapOptions.prototype.layerVisibilities;

/**
 * Array of overlay layer identifiers.
 * @type {Array<string|number>|undefined}
 * @api
 */
luxx.MapOptions.prototype.layers;

/**
 * Set the presence of a mouse position control in the map. (not included by
 * default).
 * @type {luxx.MousePositionOptions|undefined}
 */
luxx.MapOptions.prototype.mousePosition;

/**
 * The container for map popups, either the element itself or the `id` of the
 * element.
 * @type {Element|string|undefined}
 * @api
 */
luxx.MapOptions.prototype.popupTarget;

/**
 * The initial position of the center for the map view. The coordinate system
 * for the center is specified with the `positionSrs` option.
 * If a center is defined in the view, then this parameter will override the center defined in the view.
 * @type {ol.Coordinate|undefined}
 * @api
 */
luxx.MapOptions.prototype.position;

/**
 * The projection of the position coordinates.
 * Default is `2169`.
 * @type {string|number|undefined}
 * @api
 */
luxx.MapOptions.prototype.positionSrs;

/**
 * Array of queryable layers.
 * @type {Array<string|number>|undefined}
 * @api
 */
luxx.MapOptions.prototype.queryableLayers;

/**
 * The search configuration.
 * @type {luxx.SearchOption|undefined}
 * @api
 */
luxx.MapOptions.prototype.search;

/**
 * If set to true, it displays the feature information in a popup or
 * in popupTarget element.
 * @type {boolean|undefined}
 * @api
 */
luxx.MapOptions.prototype.showLayerInfoPopup;

/**
 * The container for the map, either the element itself or the `id` of the
 * element.
 * @type {Element|string}
 * @api
 */
luxx.MapOptions.prototype.target;
/**
 * The map's view.
 * @type {ol.View|undefined}
 * @api
 */
luxx.MapOptions.prototype.view;

/**
 * Zoom level used to calculate the initial resolution for the view.
 * If zoom are defined here and in the view, this parameter will override the view one.
 * @type {number|undefined}
 */
luxx.MapOptions.prototype.zoom;

/**
 * Object literal with config options for the search.
 * @typedef {Object}
 */
luxx.SearchOption;

/**
 * The container for the map, either the element itself or the `id` of the
 * element.
 * @type {Element|string}
 * @api
 */
luxx.SearchOption.prototype.target;

/**
 * A dataSets Array of layer used as search sources. Default is Adresse.
 * Possible values are 'Adresse' and 'Coordinates'.
 * @type {Array<string>|undefined}
 * @api
 */
luxx.SearchOption.prototype.dataSets;

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
 * @type {string|number|undefined}
 */
luxx.MarkerOptions.prototype.positionSrs;


/**
 * Tells whether the map should be recentered to the marker position.
 * @type {boolean|undefined}
 */
luxx.MarkerOptions.prototype.autoCenter;


/**
 * URL to an image.
 * Defaults to `//openlayers.org/en/master/examples/data/icon.png`.
 * @type {string|undefined}
 */
luxx.MarkerOptions.prototype.iconURL;


/**
 * Positioning of the icon. See
 * {@link //openlayers.org/en/latest/apidoc/ol.html#.OverlayPositioning}
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
 * If set, the popup is displayed when clicking the marker.
 * @type {boolean|undefined}
 */
luxx.MarkerOptions.prototype.click;

/**
 * The container for the marker popup, either the element itself or
 * the `id` of the element.
 * @type {Element|string}
 */
luxx.MarkerOptions.prototype.target;

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
 * The map identifier.
 * @type {string}
 * @api
 */
luxx.MyMapOptions.prototype.mapId;

/**
 * The id of the element in which to put the profile (without #). Optional. It
 * is recommended to set the display style to none at first. The display will
 * then be set to block adequately.
 * @type {string|undefined}
 * @api
 */
luxx.MyMapOptions.prototype.profileTarget;

/**
 * The function called once the map is loaded. Optional.
 * @type {function(Array<ol.Feature>)|undefined}
 * @api
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
 * @api
 */
luxx.FeaturesOptions.prototype.ids;

/**
 * Layer identifier
 * @type {string|number}
 * @api
 */
luxx.FeaturesOptions.prototype.layer;

/**
 * The container for the feature popup, either the element itself or
 * the `id` of the element.
 * @type {Element|string}
 * @api
 */
luxx.FeaturesOptions.prototype.target;

/**
 * If set, the popup is displayed when clicking the feature.
 * @type {boolean|undefined}
 * @api
 */
luxx.FeaturesOptions.prototype.click;

/**
 * If set to true, a marker is shown. Default is true.
 * @type {boolean|undefined}
 * @api
 */
luxx.FeaturesOptions.prototype.showMarker;

/**
 * Object literal with config options for the vector (GPX/KML) layer.
 * @typedef {Object}
 */
luxx.VectorOptions;

/**
 * Interval after which to reload the vector layer (in seconds).
 * @type {number | undefined}
 * @api
 */
luxx.VectorOptions.prototype.reloadInterval;

/**
 * The style function.
 * @type {ol.StyleFunction | undefined}
 * @api
 */
luxx.VectorOptions.prototype.style;

/**
 * The layer name.
 * @type {string | undefined}
 * @api
 */
luxx.VectorOptions.prototype.name;

/**
 * If set, the popup is displayed when clicking the feature.
 * @type {boolean | undefined}
 * @api
 */
luxx.VectorOptions.prototype.click;

/**
 * The container for the feature popup, either the element itself or
 * the `id` of the element.
 * @type {Element|string|undefined}
 * @api
 */
luxx.VectorOptions.prototype.target;

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
 * The address object to send to the geocoding webservice.
 * @typedef {Object}
 */
luxx.GeocodeOptions;

/**
 * The house number.
 * @type {number}
 * @api
 */
luxx.GeocodeOptions.prototype.num;

/**
 * The street name.
 * @type {string}
 * @api
 */
luxx.GeocodeOptions.prototype.street;

/**
 * The postal code.
 * @type {number}
 * @api
 */
luxx.GeocodeOptions.prototype.zip;

/**
 * The locality name.
 * @type {string}
 * @api
 */
luxx.GeocodeOptions.prototype.locality;

/**
 * The complete address into one string.
 * @type {string}
 * @api
 */
luxx.GeocodeOptions.prototype.queryString;

/**
 * @typedef {Object}
 */
luxx.GeocodeResponse;

/**
 * @type {number}
 */
luxx.GeocodeResponse.prototype.easting;

/**
 * @type {number}
 */
luxx.GeocodeResponse.prototype.easting;

/**
 * @type {number}
 */
luxx.GeocodeResponse.prototype.northing;

/**
 * Address returned by the reverse geocoding webservice.
 * @typedef {Object}
 */
luxx.ReverseGeocodeResult;

/**
 * The distance in meter between the coordinate and the found address.
 * @type {number}
 * @api
 */
luxx.ReverseGeocodeResult.prototype.distance;

/**
 * The location of the found address.
 * @type {ol.geom.Geometry}
 * @api
 */
luxx.ReverseGeocodeResult.prototype.geom;

/**
 * The internal id of the batiment.
 * @type {String}
 * @api
 */
luxx.ReverseGeocodeResult.prototype.id_caclr_bat;

/**
 * The internal id of the street.
 * @type {String}
 * @api
 */
luxx.ReverseGeocodeResult.prototype.id_caclr_street;

/**
 * The locality of the found address.
 * @type {String}
 * @api
 */
luxx.ReverseGeocodeResult.prototype.locality;

/**
 * The house number.
 * @type {String}
 * @api
 */
luxx.ReverseGeocodeResult.prototype.number;

/**
 * The postal code of the locality.
 * @type {String}
 * @api
 */
luxx.ReverseGeocodeResult.prototype.postal_code;

/**
 * The street name.
 * @type {String}
 * @api
 */
luxx.ReverseGeocodeResult.prototype.street;

/**
 * @typedef {Object}
 */
luxx.ReverseGeocodeResponse;

/**
 * The number of results.
 * @type {number}
 */
luxx.ReverseGeocodeResponse.prototype.count;

/**
 * An array of found addresses.
 * @type {Array<luxx.ReverseGeocodeResult>}
 */
luxx.ReverseGeocodeResponse.prototype.results;

/**
 * The request received by the webservice.
 * @type {Object}
 */
luxx.ReverseGeocodeResponse.prototype.request;
