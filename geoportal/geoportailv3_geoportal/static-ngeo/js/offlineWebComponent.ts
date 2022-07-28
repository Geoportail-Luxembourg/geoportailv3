import i18next from 'i18next';
import {LuxBaseElement} from './LuxBaseElement';
import {html} from 'lit';
import {customElement, state, property} from 'lit/decorators.js';

@customElement('lux-offline')
export class LuxOffline extends LuxBaseElement {

    @property({type: Boolean})
    disabled: boolean = false;

    @state()
    private server;

    @state()
    private menuDisplayed;

    @state()
    private tilePackages = {
      ALL: [],
      IN_PROGRESS: [],
      UPDATE_AVAILABLE: [],
      UP_TO_DATE: []
    };

    @state()
    private status;

    constructor() {
        super();
        const searchParams = new URLSearchParams(document.location.search);
        const server = searchParams.get('embeddedserver');
        const proto = searchParams.get('embeddedserverprotocol') || 'http';
        this.baseURL = (server ? `${proto}://${server}` : "http://localhost:8766/map/");
        if (server) {
          this.checkTiles();
        }
        this.server = server;
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
          <div class="db-button">
            <span>
              <button ?disabled="${this.disabled || !this.server}" class="no-data offline-wc" @click="${this.toggleMenu}"
                title="${i18next.t('Full offline (only available on mobile)')}"></button>
            </span>
          </div>
        ${this.menuDisplayed?this.renderMenu():""}
        `;
    }

    toggleMenu() {
      this.menuDisplayed = !this.menuDisplayed;
    }

    checkTiles() {
      fetch(this.baseURL + "/check")
        .then((response) => response.json())
        .then((statusJson) => this.getStatus(statusJson))
        .catch((error) => {
          console.error('Error:', error);
        });
    }

    getStatus(tiles) {
      this.tilePackages = {
        ALL: [],
        IN_PROGRESS: [],
        UPDATE_AVAILABLE: [],
        UP_TO_DATE: []
      }
      for(const tileKey in tiles) {
        // skip package hillshade (too large for transfers)
        if (tileKey == "hillshade-lu") {
          continue;
        }
        this.tilePackages.ALL.push(tileKey);
        if (tiles[tileKey].status === "IN_PROGRESS") {
          this.tilePackages.IN_PROGRESS.push(tileKey);
        } else if ((tiles[tileKey].current < tiles[tileKey].available) 
          || (!tiles[tileKey].current && tiles[tileKey].available)
          ) {
          this.tilePackages.UPDATE_AVAILABLE.push(tileKey);
        } else {
          this.tilePackages.UP_TO_DATE.push(tileKey);
        }
      }
      if (this.tilePackages.IN_PROGRESS.length > 0) {
        this.status = 'IN_PROGRESS';
      } else if (this.tilePackages.UPDATE_AVAILABLE.length > 0) {
        this.status = 'UPDATE_AVAILABLE';
      } else {
        this.status = 'UP_TO_DATE';
      }
      if (this.status == 'IN_PROGRESS') {
        this.reCheckTilesTimeout();
      }
    }

    updateTiles() {
      this.tilePackages.UPDATE_AVAILABLE.forEach(tilePackage => {
        this.sendRequest(tilePackage, 'PUT');
      })
    }

    deleteTiles() {
      this.tilePackages.ALL.forEach(tilePackage => {
        this.sendRequest(tilePackage, 'DELETE');
      })
  }

    sendRequest(tiles: string, method: string) {
      fetch(this.baseURL + "/map/" + tiles, {method})
        .then((data) => {
          console.log('Success:', data);
          this.checkTiles();
        })
        .catch((error) => {
          console.error('Error:', error);
        });
    }

    reCheckTilesTimeout() {
      // prevent multiple timers
      if (this.checkTimeout !== undefined) {
        clearTimeout(this.checkTimeout);
      }
      this.checkTimeout = setTimeout(()=> {
        this.checkTiles();
      }, 3000)
    }

    createRenderRoot() {
        // no shadow dom
        return this;
    }
}
