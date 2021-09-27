import './common.js';
import LuxMap from '../src/map.js';

var map = new LuxMap({
  target      : 'mapContainer',
  position    : [ 6.13, 49.61 ],
  positionSrs : '4326',
  zoom        : 14,
  layers      : [ 'arrets_bus', 650 ],
  search      : {
    target : 'mapContainer'
  }
});
