import './common.js';
import LuxMap from '../src/map.js';

var map = new LuxMap({
  target           : 'mapContainer',
  position         : [ 6.13, 49.61 ],
  positionSrs      : '4326',
  zoom             : 14,
});

map.addMyMapLayer({
  mapId: 'cf12fe433afa448bb6f3f47b4621127f',
  profileTarget: 'profile'
});

var map = new LuxMap({
  target           : 'mapContainer2',
  position         : [ 6.13, 49.61 ],
  positionSrs      : '4326',
  zoom             : 14,
});

map.addMyMapLayer({
  mapId: 'cf12fe433afa448bb6f3f47b4621127f',
  onload: function(features) {
    this.loadProfile(features[1].getGeometry(), 'profile2');
  }
});
