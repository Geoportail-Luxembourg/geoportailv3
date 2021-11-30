import 'jquery';
import 'bootstrap/js/modal.js';

import i18next from 'i18next';

import {LuxBaseElement} from './LuxBaseElement';
import {html} from 'lit';
import {customElement, state, query, property} from 'lit/decorators.js';
import {styleMap} from 'lit/directives/style-map.js';


@customElement('lux-offline')
export class LuxOffline extends LuxBaseElement {

    @state()
    private menuDisplayed;

    @state()
    private infoDisplayed;

    @state()
    private statusDict;

    @query('.modal')
    private modal: HTMLElement;

    constructor() {
        super();
    }

    static offlinePackages = [
        {title: 'roadmap', packageName: 'omt-geoportail-lu'},
        {title: 'topomap', packageName: 'omt-topo-geoportail-lu'},
        {title: 'contours', packageName: 'contours-lu'},
        {title: 'hillshade', packageName: 'hillshade-lu'},
        {title: 'resources', packageName: 'resources'},
        {title: 'fonts', packageName: 'fonts'},
        {title: 'sprites', packageName: 'sprites'}
    ]

    renderMenu() {
        return html`
<div class="offline-btns">
<div class="offline-btn btn btn-primary" @click="${this.checkTiles}">
  check background offline data
</div>
<br>
<div class="offline-btn btn btn-primary" @click="${this.showInfo}">
  show offline data info
</div>
<br>
${this.constructor.offlinePackages.map((definition) =>
    this.renderOfflinePackageItem(definition.title, definition.packageName))}
</div>
`;
    }

    renderOfflinePackageItem(title, packageName) {
        return html`
<div class="offline-btn btn btn-primary" id="PUT-${packageName}" @click="${this.alterTiles}">
  update ${title}
</div>
<div class="offline-btn btn btn-primary" id="DELETE-${packageName}" @click="${this.alterTiles}">
  delete ${title}
</div>
<br>
`;
    }

    renderInfo() {
        return html`
            <div class="modal" tabindex="-1" role="dialog">
              <div class="modal-dialog" role="document">
                <div class="modal-content">
                  <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">${i18next.t('Offline package info')}</h4>
                  </div>
                  <div class="modal-body">
    <div>
      <p><pre ng-style="{'font-size':'8px'}"> ${this.statusDict} </pre></p>
  </div>
  </div>
  </div>
  </div>
  </div>    
`;
    }

    render() {
        return html`
<div class="db-button">
  <span>
    <div class="no-data webcomponent" @click="${this.toggleMenu}"></div>
  </span>
</div>
${this.menuDisplayed?this.renderMenu():""}
${this.renderInfo()}
        `;
    }

    checkTiles()
    {
        console.log("check");
        let checkPromise = fetch("http://localhost:8766/check");
        checkPromise.then(response => response.text()).then(text => this.statusDict = text);
        this.showInfo()
    }

    showInfo()
    {
        $(this.modal).modal('show');
    }

    alterTiles(e) {
        let eventId = e.target.id;
        let separatorPos = eventId.indexOf('-');
        let method = eventId.substring(0, separatorPos);
        let packageName = eventId.substring(separatorPos+1);
        console.log(method + " " + packageName);
        let alterPromise = fetch("http://localhost:8766/map/" + packageName, {method})
        alterPromise.then(res => res.text());
    }

    toggleMenu() {
        this.menuDisplayed = !this.menuDisplayed;
    }

    createRenderRoot() {
        // no shadow dom
        return this;
    }
}
