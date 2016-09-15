goog.provide('marker');

goog.require('lux');

var map = new lux.Map({
  target: 'mapContainer',
  zoom: 14
});

var markerPos = [ 91904, 61566 ];
map.showMarker({
  position: markerPos,
  autoCenter: true,
  positioning: 'center-center',
  iconURL: 'http://apps.geoportail.lu/exemple_api/exemplesWikiGeoAPI/lion.png',
  html: '<h2>The popover</h2><p>With some content</p><ul><li>Item 1</li><li>Item 2</li></ul>'
});
