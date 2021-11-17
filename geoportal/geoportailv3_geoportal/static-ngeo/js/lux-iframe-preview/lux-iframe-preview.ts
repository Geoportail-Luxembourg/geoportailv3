import 'jquery';
import 'bootstrap/js/modal.js';

import i18next from 'i18next';

import {LuxBaseElement} from '../LuxBaseElement';
import {html} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import {styleMap} from 'lit/directives/style-map.js';


@customElement('lux-iframe-preview')
export class LuxIframePreview extends LuxBaseElement {

    @state()
    private url;

    @state()
    private size = 'small';

    @query('.modal')
    private modal: HTMLElement;

    @query('iframe')
    private iframe: HTMLIFrameElement;

    private iframeSizes = {
        'small': [400, 300],
        'medium': [600, 450],
        'large': [800, 600],
        'custom': [800, 600],
    };

    private width: number;
    private height: number;

    private iframeStyle: {[key: string]: string};
    private customSizeStyle: {[key: string]: string};

    constructor() {
        super();
        this.width = this.iframeSizes[this.size][0];
        this.height = this.iframeSizes[this.size][1];
    }

    show() {
        const url = new URL(window.location.href);
        url.searchParams.set('embedded', 'true');

        this.url = url.href;

        $(this.modal).modal('show');
    }

    sizeChanged(event) {
        this.size = event.target.value;
        this.width = this.iframeSizes[this.size][0];
        this.height = this.iframeSizes[this.size][1];
    }

    iframeReady() {
        // can't use location.href in the test because the value is 'about:blank'
        return !!this.iframe && !!this.iframe.contentWindow.location.host;
    }

    iframeCode() {
        const url = this.iframeReady() ? this.iframe.contentWindow.location.href : this.url;
        return `<iframe src="${url}" width="${this.width}" height="${this.height}" frameborder="0" style="border:0"></iframe>`;
    }

    copyIframeCode() {
        navigator.clipboard.writeText(this.iframeCode());
    }

    render() {
        this.iframeStyle = {display: this.size === 'custom' ? 'none' : ''};
        this.customSizeStyle = {display: this.size === 'custom' ? '' : 'none'};

        return html`
            <div class="modal" tabindex="-1" role="dialog">
              <div class="modal-dialog" role="document">
                <div class="modal-content">
                  <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">${i18next.t('Embed map')}</h4>
                  </div>
                  <div class="modal-body">
                    <div class="form-group">
                      <select class="form-control" @change="${this.sizeChanged}">
                        <option value="small">${i18next.t('small')}</option>
                        <option value="medium">${i18next.t('medium')}</option>
                        <option value="large">${i18next.t('large')}</option>
                        <option value="custom">${i18next.t('custom')}</option>
                      </select>
                    </div>

                      <form class="form-inline" style="${styleMap(this.customSizeStyle)}">
                       <div class="form-group">
                         <input type="number" class="form-control custom-size-input" min="0" value="${this.width}" @change="${event => this.width = parseFloat(event.target.value)}" />
                       </div>
                       X
                       <div class="form-group">
                         <input type="number" class="form-control custom-size-input" min="0" value="${this.height}" @change="${event => this.height = parseFloat(event.target.value)}" />
                      </div>
                     </form>
                   <iframe style="${styleMap(this.iframeStyle)}" src="${this.url}" width="${this.width}" height="${this.height}" frameborder="0"></iframe>

                   <div class="input-group">
                     <input type="text" class="form-control" value="${this.iframeCode()}">
                     <span class="input-group-btn">
                       <button class="btn btn-default" type="button" @click="${this.copyIframeCode}">${i18next.t('Copy')}</button>
                     </span>
                   </div>

                  </div>
                </div>
              </div>
            </div>
        `;
    }

    createRenderRoot() {
        // no shadow dom
        return this;
    }
}
