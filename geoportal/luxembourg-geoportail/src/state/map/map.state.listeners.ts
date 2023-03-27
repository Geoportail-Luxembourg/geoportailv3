import { Layer, LayerComparison, MapContext } from './map.state.model'

function equalsLayer(layerA: Layer, layerB: Layer) {
  return layerA === layerB
}
function hasLayer(context: MapContext, layer: Layer) {
  return context.layers?.some(l => equalsLayer(layer, l))
}

export class MapSateListener {
  static getAddedLayers(
    newContext: MapContext,
    oldContext: MapContext | null
  ): LayerComparison[] {
    if (!('layers' in newContext) || typeof newContext.layers === 'undefined')
      return []
    if (oldContext === null || !('layers' in oldContext)) {
      return newContext.layers.map((layer, position) => ({ layer, position }))
    }
    if (newContext.layers === oldContext.layers) return []
    return newContext.layers.reduce(
      (addedLayers: LayerComparison[], layer, i) =>
        hasLayer(oldContext, layer)
          ? addedLayers
          : [
              ...addedLayers,
              {
                layer,
                position: i,
              },
            ],
      [] as LayerComparison[]
    )
  }

  static getRemovedLayers(
    newContext: MapContext,
    oldContext: MapContext | null
  ): Layer[] {
    if (
      oldContext === null ||
      !('layers' in newContext) ||
      !('layers' in oldContext) ||
      typeof oldContext.layers === 'undefined' ||
      typeof newContext.layers === 'undefined' ||
      newContext.layers === oldContext.layers
    )
      return []
    return oldContext.layers.reduce(
      (prev, layer, i) =>
        hasLayer(newContext, layer) ? prev : [...prev, layer],
      [] as Layer[]
    )
  }
}
