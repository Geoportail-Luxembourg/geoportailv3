goog.provide('geocode');

goog.require('lux.Map');

var map = new lux.Map({
  target           : 'mapContainer',
  zoom             : 18
});

lux.geocode({
  num: 43,
  street: 'avenue gaston diderich',
  zip: 1420,
  locality: 'luxembourg'
}, function(position) {
  map.showMarker({
    position: position,
    autoCenter: true,
    positioning: 'center-center',
    iconURL: 'http://apps.geoportail.lu/exemple_api/exemplesWikiGeoAPI/lion.png'
  });
});

map.on('click', function(evt) {
  var coordinate = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:2169');
  lux.reverseGeocode(coordinate, function(address) {
    var html = [address.number, address.street, address.postal_code + ' ' + address.locality] .join(', ');
    document.getElementById('address').innerHTML = html;
  });
});
