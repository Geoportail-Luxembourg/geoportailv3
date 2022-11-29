import i18next from 'i18next';
import {LuxBaseElement} from '../../LuxBaseElement';
import {html} from 'lit';
import {customElement, state, property} from 'lit/decorators.js';
import { LuxOfflineServiceInstance, LuxOfflineService } from './lux-offline.service';
import { OfflineStatus } from './lux-offline.model';

@customElement('lux-offline')
export class LuxOffline extends LuxBaseElement {

    @property({type: Boolean})
    disabled: boolean = false;

    @property()
    private bar;

    @property()
    private scope;

    @state()
    private menuDisplayed;

    @state()
    private status;

    @state()
    private subscription;

    private offlineService: LuxOfflineService;

    constructor() {
        super();
        this.offlineService = LuxOfflineServiceInstance;
        this.subscription = this.offlineService.status$.subscribe((status)=> {
          this.status = status;
        });
    }

    disconnectedCallback() {
      this.subscription.unsubscribe();
      super.disconnectedCallback();
    }

    renderMenu() {
        return html`
          <div class="offline-btns">
            <div class="offline-btn btn btn-primary" @click="${this.updateTiles}" ?disabled="${this.status!==OfflineStatus.UPDATE_AVAILABLE}">
            ${i18next.t('Update offline data')}
            ${this.status===OfflineStatus.IN_PROGRESS
              ? html `<i class="fa fa-circle-o-notch fa-spin"></i>`
              : ''
            }
            </div>
            <br>
            <div class="offline-btn btn btn-primary" @click="${this.deleteTiles}" ?disabled="${this.status===OfflineStatus.IN_PROGRESS}">
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
        ${this.menuDisplayed ? this.renderMenu() : ""}
        `;
    }

    updateTiles(){
      if (this.status === OfflineStatus.UPDATE_AVAILABLE) {
        this.offlineService.updateTiles()
      }
    }

    deleteTiles(){
      if (this.status !== OfflineStatus.IN_PROGRESS) {
        this.offlineService.deleteTiles()
      }
    }

    toggleMenu() {
      this.menuDisplayed = !this.menuDisplayed;
      this.bar.toggleFullOffline();
      this.scope.$digest()
    }

    createRenderRoot() {
        // no shadow dom
        return this;
    }
}
