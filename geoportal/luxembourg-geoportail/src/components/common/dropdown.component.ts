import { LitElement, TemplateResult, html } from 'lit'
import { property, customElement } from 'lit/decorators'
import { DropdownOptionModel } from './dropdown.model'

@customElement('lux-dropdown')
export class Dropdown extends LitElement {
  @property() private placeholder: string
  @property() private options: DropdownOptionModel[] = []
  @property() private isOpen: boolean
  @property() private selectedValue: string | undefined

  toggleDropdown(forceOpen?: boolean) {
    this.isOpen = forceOpen === void 0 ? !this.isOpen : forceOpen
  }

  onClickOpenBtn = (event: MouseEvent) => {
    event.stopImmediatePropagation()
    this.toggleDropdown()
  }

  onClickItem = (event: MouseEvent) => {
    this.selectedValue = (event.target as HTMLElement).dataset.value
    const customEvent = new CustomEvent('change', {
      detail: {
        value: this.selectedValue,
      },
    })
    this.dispatchEvent(customEvent)
  }

  onClickOutsideOpenBtn = () => {
    this.toggleDropdown(false)
  }

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener('click', this.onClickOutsideOpenBtn)
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.onClickOutsideOpenBtn)
    super.disconnectedCallback()
  }

  render(): TemplateResult {
    return html`
      <div class="lux-dropdown">
        <div>
          <button
            type="button"
            class="lux-btn"
            id="menu-button"
            aria-expanded=${this.isOpen ? 'true' : 'false'}
            aria-haspopup="true"
            @click=${this.onClickOpenBtn}
          >
            <span>${this.placeholder ?? this.options[0].label}</span
            ><span class="lux-caret"></span>
          </button>
        </div>
        <ul
          class="lux-dropdown-list ${this.isOpen ? '' : 'hidden'}"
          tabindex="-1"
        >
          ${this.options?.map(
            option => html` <li>
              <button
                class="lux-dropdown-list-item"
                data-value="${option.value}"
                @click=${this.onClickItem}
              >
                ${option.label}
              </button>
            </li>`
          )}
        </ul>
      </div>
    `
  }

  override createRenderRoot() {
    return this
  }
}
