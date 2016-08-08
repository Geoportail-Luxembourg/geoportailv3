goog.provide('mymaps');

goog.require('lux.Map');

var map = new lux.Map({
  target           : 'mapContainer',
  position         : [ 6.13, 49.61 ],
  positionSrs      : '4326',
  zoom             : 14,
  bgLayer          : 655
});

map.addMyMapLayer('cf12fe433afa448bb6f3f47b4621127f');
