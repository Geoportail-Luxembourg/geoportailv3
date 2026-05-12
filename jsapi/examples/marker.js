import './common.js';
import LuxMap from '../src/map.js';

var map = new LuxMap({
  target: 'mapContainer',
  zoom: 14,
  bgLayer: 'topo_bw_jpeg'
});

var markerPos = [ 91904, 61566 ];
map.showMarker({
  position: markerPos,
  autoCenter: true,
  positioning: 'center-center',
  iconURL: 'lion.png',
  html: '<h2>The popover</h2><p>With some content</p><ul><li>Item 1</li><li>Item 2</li></ul>'
});
