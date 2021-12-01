import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {html} from 'lit';
import i18next from 'i18next';

import DrawInteraction from 'ol/interaction/Draw.js';
import VectorSource from 'ol/source/Vector.js';
import VectorLayer from 'ol/layer/Vector.js';

import {LuxBaseElement} from '../LuxBaseElement';


@customElement('gmf-lidar-panel')
export class GmfLidarPanel extends LuxBaseElement {

    @property({type: Boolean})
    active: boolean = false;

    @property({type: Boolean})
    drawActive: boolean = false;

    private drawInteraction: DrawInteraction;
    private vectorLayer: VectorLayer;

    constructor() {
        super();

        this.vectorLayer = new VectorLayer({
            source: new VectorSource(),
            zIndex: 1000
        });
        this.drawInteraction = new DrawInteraction({
            source: this.vectorLayer.getSource(),
            type: 'LineString'
        });
        this.drawInteraction.setActive(false);
        this.drawInteraction.on('drawend', (event) => {
            this.drawActive = false;
            console.log(event.feature.getGeometry().getCoordinates());
        });
    }

    updated(changedProperties: Map<string, any>) {
        if (changedProperties.has('active')) {
            this.onActiveChange();
        }
        if (changedProperties.has('drawActive')) {
            this.onDrawActiveChange();
        }
    }

    onActiveChange() {
        // FIXME: this should be a property passed to the component with `ng-prop`
        const map = window.map;
        if (map) {
            if (this.active) {
                map.addLayer(this.vectorLayer);
                map.addInteraction(this.drawInteraction);
            } else {
                this.drawActive = false;
                this.vectorLayer.getSource().clear();
                map.removeInteraction(this.drawInteraction);
                map.removeLayer(this.vectorLayer);
            }
        }
    }
    onDrawActiveChange() {
        this.drawInteraction.setActive(this.drawActive);
    }

    render() {
        return html`
            <div>
                <button class="btn btn-default ${classMap({active: this.drawActive})}"
                        @click="${() => this.drawActive = !this.drawActive}">${i18next.t('Draw a lidar profile')}</button>
            </div>
        `;
    }

    createRenderRoot() {
        // no shadow dom
        return this;
    }
}
