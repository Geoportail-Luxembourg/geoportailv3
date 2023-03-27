import { html, LitElement } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { i18nMixin } from '../../mixins/i18n-lit-element'

@customElement('background-selector-item')
export class BackGroundSelectorItem extends i18nMixin(LitElement) {
  @property() bgClass = ''

  constructor() {
    super()
  }

  render() {
    // prettier-ignore
    return html` <img
      class="${`h-full w-full rounded-sm lux-bg-sel-icon-bg-length bg-white ` +
               `${this.bgClass}_sm md:${this.bgClass} hd:${this.bgClass}_sm_hi hd_md:${this.bgClass}_hi`}"
    />`
  }
  createRenderRoot() {
    // no shadow dom
    return this
  }
}
