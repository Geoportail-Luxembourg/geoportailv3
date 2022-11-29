import 'jquery';
import 'bootstrap/js/modal.js';
import i18next from 'i18next';
import { combineLatestWith } from 'rxjs';
import {LuxBaseElement} from '../../LuxBaseElement';
import {html} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import { LuxOfflineServiceInstance, LuxOfflineService } from './lux-offline.service';
import { OfflineStatus } from './lux-offline.model';

@customElement('lux-offline-alert')
export class LuxOfflineAlert extends LuxBaseElement {

  @state()
  private status;

  @state()
  private subscription;

  @query('.modal-alert')
  private modal: HTMLElement;

  private prevStatus;
  private offlineService: LuxOfflineService;

  constructor() {
    super();
    this.offlineService = LuxOfflineServiceInstance;
    this.prevStatus = this.offlineService.status$.getValue();
    this.subscription = this.offlineService.status$.pipe(
      combineLatestWith(this.offlineService.tileError$)
    ).subscribe(([status, error])=> {
      if ((!error 
        && status === OfflineStatus.UPDATE_AVAILABLE)
        && (this.prevStatus === undefined 
        || this.prevStatus === OfflineStatus.UNINITIALIZED)) {
        $(this.modal).modal('show');
      }
      if (status === OfflineStatus.UP_TO_DATE) {
        $(this.modal).modal('hide');
      }
      this.status = status;
      this.prevStatus = status
    });
  }

  disconnectedCallback() {
    this.subscription.unsubscribe();
    super.disconnectedCallback();
  }

  render() {
    return html`
      <div class="modal modal-alert" tabindex="-1" role="dialog">
        <div class="modal-dialog offline-modal" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
              <h4 class="modal-title">${i18next.t('New offline data available')}</h4>
            </div>
            <div class="modal-body">
              <div>
                <div class="offline-btn btn btn-primary" @click="${this.updateTiles}" ?disabled="${this.status!==OfflineStatus.UPDATE_AVAILABLE}">
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
    if (this.status === OfflineStatus.UPDATE_AVAILABLE) {
      this.offlineService.updateTiles()
    }
  }

  createRenderRoot() {
    // no shadow dom
    return this;
  }
}