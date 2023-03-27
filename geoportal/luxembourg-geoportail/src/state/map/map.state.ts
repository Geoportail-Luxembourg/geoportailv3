import { BehaviorSubject } from 'rxjs'
import { Layer, MapContext } from './map.state.model'

const initialState: MapContext = {}

export class MapState {
  private mapContext: MapContext = initialState
  map$ = new BehaviorSubject<MapContext>(this.mapContext)
  layers$ = new BehaviorSubject<Layer[]>([])

  getLayers() {
    return this.mapContext.layers || []
  }

  addLayer(...layers: Layer[]) {
    this.mapContext = {
      ...this.mapContext,
      layers: [...new Set([...(this.mapContext.layers || []), ...layers])],
    }
    this.map$.next(this.mapContext)
    this.layers$.next(this.mapContext.layers || [])
  }

  removeLayer(...layerIds: (string | number)[]) {
    this.mapContext = {
      ...this.mapContext,
      layers:
        this.mapContext.layers?.filter(
          layer => layerIds.indexOf(layer.id) === -1
        ) || [],
    }
    this.map$.next(this.mapContext)
  }

  hasLayer(layerId: string) {
    return !!this.mapContext.layers?.find(layer => layer.id === layerId)
  }
}

export const mapState = new MapState()
