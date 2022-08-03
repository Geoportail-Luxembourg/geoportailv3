import i18next from 'i18next';
import {LuxBaseElement} from '../../LuxBaseElement';
import {html} from 'lit';
import {customElement, state, property} from 'lit/decorators.js';
import { LuxOfflineService } from './lux-offline.service';

@customElement('lux-offline')
export class LuxOffline extends LuxBaseElement {

    @property({type: Boolean})
    disabled: boolean = false;

    @state()
    private menuDisplayed;

    @state()
    private status;

    private offlineService: LuxOfflineService;

    constructor() {
        super();
        this.offlineService = new LuxOfflineService();
        this.offlineService.status$.subscribe((status)=> {
          this.status = status;
        });
    }

    renderMenu() {
        return html`
          <div class="offline-btns">
            <div class="offline-btn btn btn-primary" @click="${this.updateTiles}" ?disabled="${this.status!=="UPDATE_AVAILABLE"}">
            ${i18next.t('Update offline data')}
            ${this.status==="IN_PROGRESS"
              ? html `<i class="fa fa-circle-o-notch fa-spin"></i>`
              : ''
            }
            </div>
            <br>
            <div class="offline-btn btn btn-primary" @click="${this.deleteTiles}" ?disabled="${this.status==="IN_PROGRESS"}">
              ${i18next.t('Delete offline data')}
            </div>
            <br>
          </div>
          `;
    }

    render() {
        return html`
          <div class="db-button ol-control">
            <span>
              <button ?disabled="${this.disabled || !this.offlineService.hasLocalServer()}" class="no-data offline-wc" @click="${this.toggleMenu}"
                title="${i18next.t('Full offline (only available on mobile)')}">
                <i class="fa fa-database" aria-hidden="true"></i>
              </button>
            </span>
          </div>
        ${this.menuDisplayed?this.renderMenu():""}
        `;
    }

    updateTiles(){
      this.offlineService.updateTiles()
    }

    deleteTiles(){
      this.offlineService.deleteTiles()
    }

    toggleMenu() {
      this.menuDisplayed = !this.menuDisplayed;
    }

    createRenderRoot() {
        // no shadow dom
        return this;
    }
}
