goog.provide('mymaps2');

goog.require('common');
goog.require('lux.Map');

var map = new lux.Map({
  target           : 'mapContainer',
  position         : [ 6.13, 49.61 ],
  positionSrs      : '4326',
  zoom             : 14,
  bgLayer          : 655
});

map.addMyMapLayer({
  mapId: '8cd9c1da02644c5d880dc20da446d573',
  profileTarget: 'profile'
});
