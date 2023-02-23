import 'jquery';
import 'bootstrap/js/modal.js';
import i18next from 'i18next';
import {LuxBaseElement} from '../../LuxBaseElement';
import {html} from 'lit';
import {customElement, state, query, property} from 'lit/decorators.js';
import { LuxOfflineServiceInstance, LuxOfflineService } from './lux-offline.service';
import { OfflineStatus } from './lux-offline.model';

@customElement('lux-offline-error')
export class LuxOfflineError extends LuxBaseElement {

  @state()
  private tileError;

  @state()
  private subscription;

  @query('.modal-error')
  private modal: HTMLElement;

  private offlineService: LuxOfflineService;

  constructor() {
    super();
    this.offlineService = LuxOfflineServiceInstance;
    this.subscription = this.offlineService.tileError$.subscribe((tileError)=> {
      if (tileError) {
        $(this.modal).modal('show');
      } else {
        $(this.modal).modal('hide');
      }
      this.tileError = tileError;
    });
  }

  disconnectedCallback() {
    this.subscription.unsubscribe();
    super.disconnectedCallback();
  }

  render() {
    return html`
      <div class="modal modal-error" tabindex="-1" role="dialog">
        <div class="modal-dialog offline-modal" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
              <h4 class="modal-title">${i18next.t('An error occured during download')}</h4>
            </div>
            <div class="modal-body">
              <div>
                <div class="offline-btn btn btn-primary" @click="${this.updateTiles}">
                  ${i18next.t('Retry')}
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