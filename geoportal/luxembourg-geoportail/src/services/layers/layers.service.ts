import { Layer } from '../../state/map/map.state.model'
import { mapState } from '../../state/map/map.state'
import { themesService } from '../themes/themes.service'
import i18next from 'i18next'

export class LayersServices {
  hasIntersect = (exclusionA: string, exclusionB: string) => {
    try {
      const concat: number[] = JSON.parse(exclusionA)
        .concat(JSON.parse(exclusionB))
        .sort((a: number, b: number) => a - b)

      return concat.some(
        (element, index, array) => index && element === array[index - 1]
      )
    } catch (e) {
      return false
    }
  }

  toggleLayer = (id: number, show = true) => {
    const layer = themesService.findById(id)

    if (layer) {
      const linkedLayers = layer?.metadata?.linked_layers || []

      if (show === false) {
        mapState.removeLayer(layer.id as unknown as string, ...linkedLayers)
      } else {
        if (layer?.metadata?.exclusion) {
          const excludedLayers = mapState
            .getLayers()
            .filter(_layer =>
              this.hasIntersect(
                layer?.metadata?.exclusion as string,
                _layer?.metadata?.exclusion as string
              )
            )

          if (excludedLayers.length > 0) {
            mapState.removeLayer(...excludedLayers.map(_layer => _layer.id))

            alert(
              i18next.t(
                'The layer <b>{{layersToRemove}}</b> has been removed because it cannot be displayed while the layer <b>{{layer}}</b> is displayed',
                {
                  count: excludedLayers.length,
                  layersToRemove: excludedLayers
                    .map(_layer => i18next.t(_layer.name, { ns: 'client' }))
                    .join(', '),
                  layer: i18next.t(layer.name, { ns: 'client' }),
                  ns: 'client',
                }
              )
            )
          }
        }

        mapState.addLayer(
          layer as unknown as Layer,
          ...linkedLayers.map(
            layerId =>
              themesService.findById(parseInt(layerId, 10)) as unknown as Layer
          )
        )
      }
    }
  }
}

export const layersServices = new LayersServices()
