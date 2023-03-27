import { defaults as defaultControls } from 'ol/control'
import TileLayer from 'ol/layer/Tile'
import OlMap from 'ol/Map'
import { OSM } from 'ol/source'
import OlView from 'ol/View'

export class MapService {
  map: OlMap

  createMap(target: string | HTMLElement) {
    this.map = new OlMap({
      view: new OlView({
        zoom: 3,
        center: [0, 0],
        multiWorld: true,
      }),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      target,
      controls: defaultControls({
        zoom: false,
        rotate: false,
      }),
    })
  }
}

export const mapService = new MapService()
