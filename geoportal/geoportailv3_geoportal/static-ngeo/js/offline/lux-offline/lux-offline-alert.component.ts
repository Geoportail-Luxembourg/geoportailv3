import 'jquery';
import 'bootstrap/js/modal.js';
import i18next from 'i18next';
import {LuxBaseElement} from '../../LuxBaseElement';
import {html} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import { LuxOfflineServiceInstance } from './lux-offline.service';
import { OfflineStatus } from './lux-offline.model';

@customElement('lux-offline-alert')
export class LuxOfflineAlert extends LuxBaseElement {

  @state()
  private status;

  @state()
  private subscription;

  @query('.modal')
  private modal: HTMLElement;

  constructor() {
    super();
    this.offlineService = LuxOfflineServiceInstance;
    this.subscription = this.offlineService.status$.subscribe((status)=> {
      if (status === OfflineStatus.UPDATE_AVAILABLE) {
        $(this.modal).modal('show');
      }
      if (status === OfflineStatus.UP_TO_DATE) {
        $(this.modal).modal('hide');
      }
      this.status = status;
    });
  }

  disconnectedCallback() {
    this.subscription.unsubscribe();
    super.disconnectedCallback();
  }

  render() {
    return html`
      <div class="modal" tabindex="-1" role="dialog">
        <div class="modal-dialog offline-modal" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
              <h4 class="modal-title">${i18next.t('New offline data available')}</h4>
            </div>
            <div class="modal-body">
              <div>
                <div class="offline-btn btn btn-primary" @click="${this.updateTiles}">
                  ${i18next.t('Update offline data')}
                  ${this.status===OfflineStatus.IN_PROGRESS
                    ? html `<i class="fa fa-circle-o-notch fa-spin"></i>`
                    : ''
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  updateTiles(){
    this.offlineService.updateTiles()
  }

  createRenderRoot() {
    // no shadow dom
    return this;
  }
}