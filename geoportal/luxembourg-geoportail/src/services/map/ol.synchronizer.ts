import OlMap from 'ol/Map'
import { pairwise } from 'rxjs'
import { MapSateListener } from '../../state/map/map.state.listeners'
import { mapState } from '../../state/map/map.state'
import { Openlayers } from './ol.service'

export class OlSynchronizer {
  constructor(map: OlMap) {
    mapState.map$.pipe(pairwise()).subscribe(([oldContext, newContext]) => {
      const removedLayers = MapSateListener.getRemovedLayers(
        newContext,
        oldContext
      )
      const addedLayerComparisons = MapSateListener.getAddedLayers(
        newContext,
        oldContext
      )

      removedLayers.forEach(layer =>
        Openlayers.removeLayer(map, layer.id as string)
      )

      addedLayerComparisons.forEach(cmp =>
        Openlayers.addLayer(map, cmp.layer, cmp.position)
      )

      console.log('state change', newContext)
    })
  }
}
