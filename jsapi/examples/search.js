goog.provide('simplesearch');

goog.require('lux.Map');

var map = new lux.Map({
  target      : 'mapContainer',
  position    : [ 6.13, 49.61 ],
  positionSrs : '4326',
  zoom        : 14,
  bgLayer     : 655,
  layers      : [ 'arrets_bus', 650 ],
  search      : {
    target : 'mapContainer'
  }
});
