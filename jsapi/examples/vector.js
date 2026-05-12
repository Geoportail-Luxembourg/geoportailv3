import './common.js';
import LuxMap from '../src/map.js';

var map = new LuxMap({
  target           : 'mapContainer',
  position         : [ 6.13, 49.61 ],
  positionSrs      : '4326',
  zoom             : 14,
  mousePosition    : {
    target: 'mapContainer',
    srs : 4326
  }
});

map.addGPX('gpx-trace.gpx?fdfd=f', {
  reloadInterval: 5
});
map.addKML('elements.kml');
