import {customElement, property} from 'lit/decorators.js';
import {html} from 'lit';
import i18next from 'i18next';

import {LuxBaseElement} from '../LuxBaseElement';


@customElement('gmf-lidar-panel')
export class GmfLidarPanel extends LuxBaseElement {
    @property({type: Object}) map;

    toggleDraw(event: PointerEvent) {
        event.target.classList.toggle('active');
        console.log(this.map);
    }

    render() {
        console.log(this.map);
        return html`
            <div>
                <button class="btn btn-default" @click="${this.toggleDraw}">${i18next.t('Draw a lidar profile')}</button>
            </div>
        `;
    }

    createRenderRoot() {
        // no shadow dom
        return this;
    }
}
