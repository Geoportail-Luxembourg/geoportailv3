import i18next from 'i18next'
import { html, LitElement, TemplateResult } from 'lit'
import { customElement } from 'lit/decorators'
import { property } from 'lit/decorators.js'
import { i18nMixin } from '../../../../mixins/i18n-lit-element'

@customElement('lux-layer-tree-node')
export class LayerTreeNode extends i18nMixin(LitElement) {
  @property() private node: any

  constructor() {
    super()
  }

  isParent(): boolean {
    return !!this.node.children
  }
  isRoot(): boolean {
    return this.node.depth === 0
  }
  isMaxDepth(): boolean {
    return this.node.depth >= 10
  }

  toggleLayer() {
    const event = new CustomEvent(`layer-toggle`, {
      bubbles: true,
      detail: this.node,
    })
    this.dispatchEvent(event)
  }
  toggleParent() {
    const event = new CustomEvent(`parent-toggle`, {
      bubbles: true,
      detail: this.node,
    })
    this.dispatchEvent(event)
  }

  private getLabel() {
    return i18next.t(this.node.name, { ns: 'client' })
  }

  renderParent(): TemplateResult {
    return html`<div class="mb-px">
      ${this.node.depth === 1
        ? html`
            <button
              class="node-1 w-full text-left flex px-2 py-1.5 uppercase bg-tertiary ${this
                .node.expanded
                ? 'text-white'
                : 'text-secondary'}"
              aria-expanded="${this.node.expanded}"
              @click="${this.toggleParent}"
            >
              <div class="grow">${this.getLabel()}</div>
              <div class="leading-6">
                <div
                  class="fa fa-sharp fa-solid fa-caret-${this.node.expanded
                    ? 'up'
                    : 'down'}"
                ></div>
              </div>
            </button>
          `
        : this.node.depth > 1 && !this.isMaxDepth()
        ? html`
            <button
              class="w-full text-left flex px-2 py-1.5 pl-2 ${this.node.expanded
                ? 'bg-secondary text-tertiary'
                : 'bg-white text-primary'}"
              aria-expanded="${this.node.expanded}"
              @click="${this.toggleParent}"
            >
              <div class="grow">${this.getLabel()}</div>
              <div class="leading-6">
                <div
                  class="fa fa-sharp fa-solid fa-${this.node.expanded
                    ? 'minus'
                    : 'plus'}"
                ></div>
              </div>
            </button>
          `
        : ''}
      ${this.isMaxDepth() ? '' : this.renderChildren()}
    </div>`
  }

  renderLeaf(): TemplateResult {
    return html`
      <div class="flex text-tertiary pr-2">
        <button
          class="self-start before:text-[.85rem] before:transform before:translate-y-[.1rem] before:inline-block fa fa-solid fa-fw fa-fh fa-info"
        ></button>
        <button
          class="w-full text-left  ${this.node.checked ? 'font-bold' : ''}"
          @click="${this.toggleLayer}"
        >
          <i
            class="fa fa-solid ${this.node.checked
              ? 'fa-check-square'
              : 'fa-square'}"
          ></i>
          <span class="hover:underline">${this.getLabel()}</span>
        </button>
      </div>
    `
  }

  renderChildren(): TemplateResult {
    return html` <div
      class="bg-secondary
        ${this.node.depth > 1 ? 'pl-2' : ''}
        ${!this.isRoot() ? 'lux-collapse' : ''}
        ${!this.isRoot() && this.node.expanded ? 'expanded' : ''}
      "
    >
      ${this.node.children?.map((node: LayerTreeNode) => {
        return html`
          <lux-layer-tree-node .node="${node}"></lux-layer-tree-node>
        `
      })}
    </div>`
  }

  render(): TemplateResult {
    const node = this.node
    if (node) {
      return html`
        <style>
          .node-1:hover .fa-solid {
            color: white;
          }
        </style>
        ${this.isParent() ? this.renderParent() : this.renderLeaf()}
      `
    }
    return html``
  }

  override createRenderRoot() {
    return this
  }
}
