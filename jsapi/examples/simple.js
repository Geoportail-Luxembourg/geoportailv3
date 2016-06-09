goog.provide('index');

goog.require('lux');

var map = new lux.Map({
  target      : 'mapContainer',
  position    : [ 6.13, 49.61 ],
  positionSrs : '4326',
  zoom        : 14,
  bgLayer     : 'streets_jpeg',
  layers      : [ '543' ]
});
