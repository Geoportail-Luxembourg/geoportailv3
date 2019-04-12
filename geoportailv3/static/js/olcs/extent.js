goog.module('app.olcs.Extent');

goog.module.declareLegacyNamespace();
const olProj = goog.require('ol.proj');


/**
 * The OpenLayers extent used in 3D to restrict the area rendered by Cesium.
 * @type {ol.Extent}
 */
exports = olProj.transformExtent([5.31, 49.38, 6.64, 50.21], 'EPSG:4326', 'EPSG:3857');
