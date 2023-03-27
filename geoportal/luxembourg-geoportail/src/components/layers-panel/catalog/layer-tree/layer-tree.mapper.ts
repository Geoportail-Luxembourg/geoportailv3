import { ThemeNodeModel } from '../../../../services/themes/themes.model'
import { LayerTreeNodeModel } from './layer-tree.model'

export function themesToLayerTree(
  node: ThemeNodeModel,
  depth = 0
): LayerTreeNodeModel {
  const { name, id, children, metadata } = node
  return {
    name,
    id: id as unknown as string,
    depth,
    children: children?.map(child => themesToLayerTree(child, depth + 1)),
    checked: false,
    expanded: metadata?.is_expanded || false,
  }
}
