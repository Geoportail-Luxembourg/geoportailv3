import 'jquery';
import 'bootstrap/js/modal.js';

import i18next from 'i18next';

import {html, LitElement} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';


@customElement('lux-iframe-preview')
export class LuxIframePreview extends LitElement {

    @state()
    url;

    @state()
    size = 'small';


    @query('.modal')
    modal;


    @query('iframe')
    iframe;

    private iframeSizes = {
        'small': [400, 300],
        'medium': [600, 450],
        'large': [800, 600],
    };

    show() {
        const url = new URL(window.location.href);
        url.searchParams.set('embedded', 'true');

        this.url = url.href;

        $(this.modal).modal('show');
    }

    sizeChanged(event) {
        this.size = event.target.value;
    }

    iframeReady() {
        // can't use location.href in the test because the value is 'about:blank'
        return !!this.iframe && !!this.iframe.contentWindow.location.host;
    }

    iframeCode() {
        const url = this.iframeReady() ? this.iframe.contentWindow.location.href : this.url;
        return `<iframe src="${url}" width="${this.iframeSizes[this.size][0]}" height="${this.iframeSizes[this.size][1]}" frameborder="0" style="border:0"></iframe>`;
    }

    copyIframeCode() {
        navigator.clipboard.writeText(this.iframeCode()).then(() => {
            console.log('ok')
        });
    }

    render() {
        return html`
            <div class="modal" tabindex="-1" role="dialog">
              <div class="modal-dialog" role="document">
                <div class="modal-content">
                  <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">${i18next.t('Embed map')}</h4>
                  </div>
                  <div class="modal-body">
                  <form class="form-inline">
                    <div class="form-group">
                      <select class="form-control" @change="${this.sizeChanged}">
                        <option value="small">${i18next.t('small')}</option>
                        <option value="medium">${i18next.t('medium')}</option>
                        <option value="large">${i18next.t('large')}</option>
                        <option value="custom">${i18next.t('custom')}</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <div class="input-group">
                        <input type="text" class="form-control" value="${this.iframeCode()}">
                        <span class="input-group-btn">
                          <button class="btn btn-default" type="button" @click="${this.copyIframeCode}">${i18next.t('Copy')}</button>
                        </span>
                      </div>
                    </div>
                   </form>

                   <iframe src="${this.url}" width="${this.iframeSizes[this.size][0]}" height="${this.iframeSizes[this.size][1]}" frameborder="0"></iframe>
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
