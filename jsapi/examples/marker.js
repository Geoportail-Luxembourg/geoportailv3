goog.provide('marker');

goog.require('lux');

var map = new lux.Map({
  target: 'mapContainer',
  lon: 6.13,
  lat: 49.61,
  zoom: 14,
  layers: [ 'streets_jpeg' ]
});

map.showMarker({
  position: new ol.proj.transform([2, 3], 'EPSG:4326', 'EPSG:3857'),
  autoCenter: true,
  positioning: 'center-center',
  iconURL: 'http://apps.geoportail.lu/exemple_api/exemplesWikiGeoAPI/lion.png',
  html: '<h2>The popover</h2><p>With some content</p><ul><li>Item 1</li><li>Item 2</li></ul>'
});
