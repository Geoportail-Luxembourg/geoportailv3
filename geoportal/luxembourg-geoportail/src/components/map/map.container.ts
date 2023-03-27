import { html, LitElement, TemplateResult } from 'lit'
import { customElement } from 'lit/decorators'
import { mapService } from '../../services/map/map.service'
import { OlSynchronizer } from '../../services/map/ol.synchronizer'

@customElement('lux-map-container')
export class MapContainer extends LitElement {
  connectedCallback() {
    super.connectedCallback()
    // todo: find the correct lifecycle method
    setTimeout(() => {
      mapService.createMap('map')
      new OlSynchronizer(mapService.map)
    })
  }

  render(): TemplateResult {
    return html`<div id="map" class="h-full w-full"></div>`
  }

  override createRenderRoot() {
    return this
  }
}
