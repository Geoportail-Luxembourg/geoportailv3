goog.provide('app.LocationControlOptions');

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
