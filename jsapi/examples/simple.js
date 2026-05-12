import './common.js';
import LuxMap from '../src/map.js';

var map = new LuxMap({
  target           : 'mapContainer',
  position         : [ 6.13, 49.61 ],
  positionSrs      : '4326',
  zoom             : 14,
  bgLayer          : 501,
  layers           : [ 147 ],
  layerOpacities   : [0.5],
  mousePosition    : {
    target: 'mapContainer',
    srs : 4326
  },
  bgSelector       : {
    target : 'mapContainer'
  },
  layerManager     : {
    target: 'layerManager'
  }
});

window.setTimeout(function() {
  map.addLayerById(302);
}, 1000);
