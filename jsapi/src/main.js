goog.provide('lux');
goog.provide('lux.Map');

goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.layer.Tile');
goog.require('ol.source.OSM');

/**
 * @classdesc
 * The map is the core component of the Geoportail V3 API.
 *
 * @constructor
 * @extends {ol.Map}
 * @param {olx.MapOptions} options Map options.
 * @export
 */
lux.Map = function(options) {
  options.view = new ol.View({
    zoom: 5,
    center: [0, 0]
  });
  options.layers = [new ol.layer.Tile({
    source: new ol.source.OSM()
  })];
  goog.base(this, options);
};
goog.inherits(lux.Map, ol.Map);
