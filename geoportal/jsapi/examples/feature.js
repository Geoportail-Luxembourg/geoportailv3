import './common.js';
import lux from '../src/index.js'
import LuxMap from '../src/map.js';

var map = new LuxMap({
  target      : 'mapContainer',
  position    : [ 6.13, 49.61 ],
  positionSrs : '4326',
  zoom        : 14,
  layers      : [ 'arrets_bus', 543 ],
  features    : {
    ids   : ['103242'],
    layer : '199'
  }
});

lux.setPopupSize([400, 200]);
