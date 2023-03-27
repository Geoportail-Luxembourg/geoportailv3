import { html, LitElement } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { ThemeNodeModel } from '../../../../services/themes/themes.model'
import i18next from 'i18next'
import { i18nMixin } from '../../../../mixins/i18n-lit-element'

@customElement('lux-theme-grid')
export class ThemeGrid extends i18nMixin(LitElement) {
  @property({ type: Object }) themes?: ThemeNodeModel[]

  render() {
    return html`${this.themes?.map(
      theme =>
        html`<button
          class="relative shrink-0 h-[150] w-1/2 px-2.5 text-start text-gray-100/40 uppercase bg-${theme.name}-primary hover:bg-[#ccc] hover:text-${theme.name}-primary"
          @click="${() => this.setTheme(theme.name)}"
        >
          <div class="text-2xl absolute top-5">
            ${i18next.t(`${theme.name}`)}
          </div>
          <div
            class="text-6xl absolute bottom-1 after:content-${theme.name} after:font-icons"
          ></div>
        </button>`
    )} `
  }

  setTheme(themeName: string) {
    const event = new CustomEvent(`set-theme`, {
      bubbles: true,
      detail: themeName,
    })
    this.dispatchEvent(event)
  }

  override createRenderRoot() {
    return this
  }
}
