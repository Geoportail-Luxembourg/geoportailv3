import { html, LitElement, TemplateResult } from 'lit'
import { customElement, state } from 'lit/decorators'
import { Subscription } from 'rxjs'
import { ThemeNodeModel } from '../../../services/themes/themes.model'
import { themesService } from '../../../services/themes/themes.service'
import { themingService } from './theme/theming.service'

import './theme/theme-grid.component'
import './theme/theme-selector-button.component'

@customElement('lux-theme-selector')
export class ThemeSelector extends LitElement {
  @state()
  private isOpen = false
  @state()
  private currentTheme?: ThemeNodeModel
  @state()
  private themes?: ThemeNodeModel[]
  private subscription: Subscription
  constructor() {
    super()
    this.subscription = themesService.theme$.subscribe(theme => {
      if (theme) {
        this.currentTheme = theme
        themingService.setCurrentThemeColors(theme)
      }
    })
    this.subscription.add(
      themesService.themes$.subscribe(themes => {
        this.themes = themes.filter(
          theme => theme.metadata?.display_in_switcher === true
        )
      })
    )
  }

  toggleThemesGrid() {
    this.isOpen = !this.isOpen
  }

  render(): TemplateResult {
    return html`
      <lux-theme-selector-button
        @click="${this.toggleThemesGrid}"
        .themes="${this.themes}"
        .currentTheme="${this.currentTheme}"
        .isOpen="${this.isOpen}"
      ></lux-theme-selector-button>
      ${this.isOpen
        ? html` <div
            class="absolute inset-x-0 top-14 bottom-0 mt-1 bg-primary overflow-y-auto overflow-x-hidden"
          >
            <lux-theme-grid
              @set-theme="${this.setTheme}"
              .themes="${this.themes}"
              class="flex flex-row flex-wrap pl-2.5"
            ></lux-theme-grid>
          </div>`
        : html``}
    `
  }

  setTheme(event: CustomEvent) {
    themesService.setTheme(event.detail)
    this.toggleThemesGrid()
  }

  disconnectedCallback() {
    this.subscription.unsubscribe()
    super.disconnectedCallback()
  }

  override createRenderRoot() {
    return this
  }
}
