goog.provide('feature');

goog.require('common');
goog.require('lux.Map');

var map = new lux.Map({
  target      : 'mapContainer',
  position    : [ 6.13, 49.61 ],
  positionSrs : '4326',
  zoom        : 14,
  bgLayer     : 655,
  layers      : [ 'arrets_bus', 543 ],
  features    : {
    ids   : ['103242'],
    layer : '199'
  }
});
