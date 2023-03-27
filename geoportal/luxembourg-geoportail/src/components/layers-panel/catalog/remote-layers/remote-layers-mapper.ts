import { mapState } from '../../../../state/map/map.state'
import { Layer, LayerImageType } from '../../../../state/map/map.state.model'
import { LayerTreeNodeModel } from '../layer-tree/layer-tree.model'
import {
  OgcClientWmsLayerSummary,
  OgcClientWmsLayerFull,
} from './remote-layers.model'

function sortLayerTreeNoChildrenFirst(
  a: OgcClientWmsLayerSummary,
  b: OgcClientWmsLayerSummary
) {
  if (a.children && !b.children) {
    return 1
  }

  if (b.children && !a.children) {
    return -1
  }

  return 0
}

export function remoteLayersToLayerTreeMapper(
  node: OgcClientWmsLayerSummary,
  urlWms: string,
  depth = 0
): LayerTreeNodeModel {
  const { name, children } = node
  const id = `WMS||${urlWms}${name}`.split('-').join('%2D')

  return {
    id,
    name,
    depth,
    children: children
      ?.sort(sortLayerTreeNoChildrenFirst)
      .map(child => remoteLayersToLayerTreeMapper(child, urlWms, depth + 1)),
    checked: mapState.hasLayer(id),
    expanded: false,
  }
}

export function remoteLayerToLayer({
  id,
  url,
  remoteLayer,
}: {
  id: string
  url: string
  remoteLayer: OgcClientWmsLayerFull
}): Layer {
  const { name = '' } = remoteLayer

  return {
    id,
    name,
    layers: name,
    url,
    type: 'WMS',
    imageType: LayerImageType.PNG,
  }
}
