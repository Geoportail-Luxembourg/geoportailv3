import { Layer } from '../../../../state/map/map.state.model'
import { LayerTreeNodeModel, LayerTreeToggleProperty } from './layer-tree.model'

export class LayerTreeService {
  toggleNode(
    id: string,
    node: LayerTreeNodeModel,
    propertyName: LayerTreeToggleProperty
  ): LayerTreeNodeModel {
    if (node?.id === id) {
      return {
        ...node,
        [propertyName]: !node[propertyName],
      }
    } else {
      return {
        ...node,
        children: node.children?.map(child =>
          this.toggleNode(id, child, propertyName)
        ),
      }
    }
  }

  updateLayers(
    node: LayerTreeNodeModel,
    layers: Layer[] | undefined
  ): LayerTreeNodeModel {
    const { id } = node
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => this.updateLayers(child, layers)),
      }
    } else {
      const checked = !!layers?.find(l => l.id === id)
      return {
        ...node,
        checked,
      }
    }
  }
}

export const layerTreeState = new LayerTreeService()
