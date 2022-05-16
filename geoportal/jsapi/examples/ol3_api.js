import './common.js';
import LuxMap from '../src/map.js';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {transform} from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';

var map = new LuxMap({
  target: 'mapContainer',
  bgLayer: 'topo_bw_jpeg',
  zoom: 18,
  position: [75977, 75099]
});

var cadastreFeature = new Feature({
  geometry: new Point(transform([75977, 75099], 'EPSG:2169', 'EPSG:3857')),
  name: 'Cadastre'
});
var iconStyle = new Style({
  image: new Icon(({
    anchor: [0.5, 46],
    anchorXUnits: 'fraction',
    anchorYUnits: 'pixels',
    src: 'lion.png'
  }))
});
cadastreFeature.setStyle(iconStyle);
var vectorSource = new VectorSource({
    features: [cadastreFeature]
});
var vectorLayer = new VectorLayer({
    source: vectorSource
});

map.on('click', function(evt) {
  var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
    return feature;
  });
  if (feature !== undefined) {
    document.getElementById('info').innerHTML = "Name : " + feature.get('name');
  } else {
    document.getElementById('info').innerHTML = "";
  }
});

map.addLayer(vectorLayer);
