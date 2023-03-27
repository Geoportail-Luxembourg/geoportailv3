import { html, LitElement, TemplateResult } from 'lit'
import { customElement, state } from 'lit/decorators'
import { Subscription } from 'rxjs'
import { layersServices } from '../../../services/layers/layers.service'
import { ThemeNodeModel } from '../../../services/themes/themes.model'
import { themesService } from '../../../services/themes/themes.service'
import { mapState } from '../../../state/map/map.state'

import './layer-tree/layer-tree-node.component'
import { themesToLayerTree } from './layer-tree/layer-tree.mapper'
import { LayerTreeNodeModel } from './layer-tree/layer-tree.model'
import { layerTreeState } from './layer-tree/layer-tree.service'

@customElement('lux-catalog')
export class Catalog extends LitElement {
  @state()
  private layerTree: LayerTreeNodeModel | undefined
  private subscription = new Subscription()

  constructor() {
    super()
    themesService.theme$.subscribe(theme => {
      this.layerTree = themesToLayerTree(theme as ThemeNodeModel)

      this.subscription.add(
        mapState.map$.subscribe(mapContext => {
          this.layerTree = layerTreeState.updateLayers(
            this.layerTree as LayerTreeNodeModel,
            mapContext.layers
          )
        })
      )
    })
  }

  private toggleParent(event: Event) {
    const node = (event as CustomEvent).detail

    this.layerTree = layerTreeState.toggleNode(
      node.id,
      this.layerTree as LayerTreeNodeModel,
      'expanded'
    )
  }

  private toggleLayer(event: Event) {
    const node = (event as CustomEvent).detail
    layersServices.toggleLayer(node.id, !node.checked)
  }

  render(): TemplateResult {
    return html`
      <lux-layer-tree-node
        .node="${this.layerTree}"
        @parent-toggle="${this.toggleParent}"
        @layer-toggle="${this.toggleLayer}"
      ></lux-layer-tree-node>
    `
  }

  disconnectedCallback() {
    this.subscription.unsubscribe()
    super.disconnectedCallback()
  }

  override createRenderRoot() {
    return this
  }
}
