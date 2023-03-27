import { html, LitElement, TemplateResult } from 'lit'
import { customElement } from 'lit/decorators'
import i18next from 'i18next'
import { i18nMixin } from '../../mixins/i18n-lit-element'
import './catalog/remote-layers/remote-layers'
import './catalog/CatalogTab'

@customElement('lux-layer-panel')
export class LayerPanel extends i18nMixin(LitElement) {
  render(): TemplateResult {
    return html`
      <div class="flex flex-col h-full">
        <div class="h-20 shrink-0">
          <div class="lux-panel-title">
            ${i18next.t('Layers', { ns: 'client' })}
          </div>
        </div>
        <!--catalog tab-->
        <div class="relative grow p-2.5 bg-primary overflow-auto">
          <lux-catalog-tab></lux-catalog-tab>
        </div>
        <lux-remote-layers></lux-remote-layers>
      </div>
    `
  }

  override createRenderRoot() {
    return this
  }
}
