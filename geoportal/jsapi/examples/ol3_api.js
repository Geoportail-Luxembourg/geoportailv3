goog.provide('ol3_api');

goog.require('common');
goog.require('lux');

var map = new lux.Map({
  target: 'mapContainer',
  bgLayer: 'topo_bw_jpeg',
  zoom: 18,
  position: [75977, 75099 ]
});

var cadastreFeature = new ol.Feature({
  geometry: new ol.geom.Point(ol.proj.transform([75977, 75099], 'EPSG:2169', 'EPSG:3857')),
  name: 'Cadastre'
});
var iconStyle = new ol.style.Style({
  image: new ol.style.Icon(({
    anchor: [0.5, 46],
    anchorXUnits: 'fraction',
    anchorYUnits: 'pixels',
    src: 'http://apps.geoportail.lu/exemple_api/exemplesWikiGeoAPI/lion.png'
  }))
});
cadastreFeature.setStyle(iconStyle);
var vectorSource = new ol.source.Vector({
    features: [cadastreFeature]
});
var vectorLayer = new ol.layer.Vector({
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
