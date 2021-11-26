import Manager from './Manager'

import './style.css'
import './lidarprofile.css'
import {Map, View} from 'ol'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import OSM from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';

import { getConfig } from './config'


proj4.defs("EPSG:2056","+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");

register(proj4);

const source = new VectorSource()
const format = new GeoJSON({
  featureProjection: 'EPSG:3857',
  dataProjection: 'EPSG:4326'
})

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    new VectorLayer({
      source
    })
  ],
  view: new View({
    center: [0, 0],
    zoom: 2
  })
})

const manager = new Manager()
const config = getConfig()

const lineFeature = format.readFeature( {
  "type": "Feature",
  "properties": {},
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [
        6.9495391845703125,
        47.03175858136222
      ],
      [
        6.9488525390625,
        47.02309964439266
      ],
      [
        6.960697174072266,
        47.02228048303955
      ],
      [
        6.963100433349609,
        47.01537562362976
      ]
    ]
  }
})

source.addFeature(lineFeature)

manager.init(config, map)
manager.setLine(lineFeature.clone().getGeometry().transform('EPSG:3857', 'EPSG:2056'))

map.getView().fit(lineFeature.getGeometry(), { padding: [50, 50, 50, 50] })

manager.getProfileByLOD([], 0, true, config.serverConfig.minLOD);
