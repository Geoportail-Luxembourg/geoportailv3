import './common.js';
import lux from '../src/index.js';
import LuxMap from '../src/map.js';
import {transform} from 'ol/proj';

var map = new LuxMap({
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
    iconURL: 'lion.png'
  });
});

map.on('click', function(evt) {
  var coordinate = transform(evt.coordinate, 'EPSG:3857', 'EPSG:2169');
  lux.reverseGeocode(coordinate, function(address) {
    var html = [address.number, address.street, address.postal_code + ' ' + address.locality] .join(', ');
    document.getElementById('address').innerHTML = html;
  });
});
