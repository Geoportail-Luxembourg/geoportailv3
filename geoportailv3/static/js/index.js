
/**
 * @typedef {{themes: Array.<Object>, background_layers: Array.<Object>}}
 */
app.ThemesResponse;

/**
 * @typedef {function(ol.Coordinate, string, string, boolean, boolean):string}
 */
app.CoordinateString;

/**
 * @typedef {{point: Array.<ol.style.Style>, default: Array.<ol.style.Style>}}
 */
app.query.QueryStyles;

/**
 * @typedef {function(string, app.NotifyNotificationType)}
 */
app.Notify;

/**
 * @typedef {Array.<Object>}
 */
app.MapsResponse;

/**
 * @typedef {{className: (string|undefined),
 *     label: (string|undefined),
 *     tipLabel: (string|undefined),
 *     target: (Element|undefined),
 *     drawLineInteraction: app.interaction.DrawRoute
 * }}
 */
app.draw.RouteControlOptions;

/**
 * @typedef {ol.Collection<ol.Feature>}
 */
app.draw.SelectedFeatures;


/**
 * @typedef {function(Object):ol.layer.Layer}
 */
app.GetLayerForCatalogNode;

/**
 * @typedef {function(ol.Coordinate):!angular.$q.Promise}
 */
app.GetElevation;

/**
 * @typedef {function(
 *  (ol.geom.MultiLineString|ol.geom.LineString),
 *  string=):!angular.$q.Promise
 *  }
 */
app.GetProfile;

/**
 * @typedef {function(ol.Coordinate=):!angular.$q.Promise}
 */
app.GetShorturl;


/**
 * @typedef {function(string, string, boolean):ol.layer.Tile}
 */
app.GetWmtsLayer;


/**
 * @typedef {function(ol.layer.Layer)}
 */
app.layerinfo.ShowLayerinfo;

/**
 * @typedef {function(string, string, string, string=):ol.layer.Image}
 */
app.GetWmsLayer;

/**
 * @typedef {{className: (string|undefined),
 *     label: (string|undefined),
 *     tipLabel: (string|undefined),
 *     target: (Element|undefined),
 *     featureOverlayMgr: ngeo.map.FeatureOverlayMgr,
 *     notify: app.Notify,
 *     gettextCatalog: angularGettext.Catalog,
 *     scope: angular.Scope,
 *     window: angular.$window
 * }}
 */
app.LocationControlOptions;
