import { html, LitElement, TemplateResult } from 'lit'
import { customElement } from 'lit/decorators'

import './Catalog'
import './ThemeSelector'

@customElement('lux-catalog-tab')
export class CatalogTab extends LitElement {
  render(): TemplateResult {
    return html`
      <div class="flex flex-col">
        <lux-theme-selector></lux-theme-selector>
        <lux-catalog class="pt-5"></lux-catalog>
      </div>
    `
  }

  override createRenderRoot() {
    return this
  }
}
