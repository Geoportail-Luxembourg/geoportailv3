import type { TemplateResult } from 'lit'
import { html, LitElement } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('luxembourg-geoportail')
export class LuxembourgGeoportail extends LitElement {
  @property({ type: String }) title = 'Luxembourg Geoportail'

  render(): TemplateResult {
    return html`
      <h1
        class="mx-auto my-4 py-4 text-center text-primary shadow-primary-light shadow-lg text-xl w-1/2"
      >
        Hello, ${this.title} !
      </h1>
    `
  }

  override createRenderRoot() {
    return this
  }
}
