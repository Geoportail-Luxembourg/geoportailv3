goog.provide('marker');

goog.require('lux');

var position =  [ 682773.755, 6394645.349 ];
var map = new lux.Map({
  target: 'mapContainer',
  position: position,
  zoom: 14,
  layers: [ 'streets_jpeg' ]
});

map.showMarker({
  position: position,
  autoCenter: true,
  positioning: 'center-center',
  iconURL: 'http://apps.geoportail.lu/exemple_api/exemplesWikiGeoAPI/lion.png',
  html: '<h2>The popover</h2><p>With some content</p><ul><li>Item 1</li><li>Item 2</li></ul>'
});
