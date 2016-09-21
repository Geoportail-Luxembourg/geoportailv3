goog.provide('index');

goog.require('lux.Map');

var map = new lux.Map({
  target           : 'mapContainer',
  position         : [ 6.13, 49.61 ],
  positionSrs      : '4326',
  zoom             : 14,
  bgLayer          : 653,
  layers           : [ 145 ],
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
  map.addLayerById(204);
}, 1000);
