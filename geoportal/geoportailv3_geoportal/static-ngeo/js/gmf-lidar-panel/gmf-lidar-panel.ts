import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {html} from 'lit';
import i18next from 'i18next';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import DrawInteraction from 'ol/interaction/Draw.js';
import VectorSource from 'ol/source/Vector.js';
import VectorLayer from 'ol/layer/Vector.js';
import LineString from 'ol/geom/LineString';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON'
import {LuxBaseElement} from '../LuxBaseElement';
import {LidarManager} from '../../ngeo/contribs/gmf/src/lidarprofile/Manager';
import { getConfig } from '../../ngeo/contribs/gmf/src/lidarprofile/config'
import saveCsv from 'save-csv/save-csv.min';

@customElement('gmf-lidar-panel')
export class GmfLidarPanel extends LuxBaseElement {
    @property({type: Object}) map;

    @property({type: Boolean})
    active: boolean = false;

    @property({type: Boolean})
    drawActive: boolean = true;

    @property({type: Object})
    config: object = getConfig();

    @property({type: Boolean})
    measureActive: boolean = false;

    private classifications: [] = this.config.serverConfig.classification_colors;

    private drawInteraction: DrawInteraction;
    private vectorLayer: VectorLayer;
    private coordinates: LineString;
    private manager: LidarManager;
    constructor() {
        super();
        this.manager = new LidarManager()
        this.lineStyle = new Style({
            stroke: new Stroke({
                color: '#ffcc33',
                width: 3,
            }),
        });
        this.vectorLayer = new VectorLayer({
            source: new VectorSource(),
            zIndex: 1000,
            style: this.lineStyle
        });
        this.drawInteraction = new DrawInteraction({
            source: this.vectorLayer.getSource(),
            type: 'LineString'
        });
        this.drawInteraction.setActive(false);
        this.drawInteraction.on('drawstart', (event) => {
            if (this.coordinates) this.clearProfile()
        })
        this.drawInteraction.on('drawend', (event) => {
            this.drawActive = false;
            this.coordinates = event.feature.getGeometry();
            this.generatePlot(event.feature);
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
        if (this.map) {
            if (this.active) {
                this.map.addLayer(this.vectorLayer);
                this.map.addInteraction(this.drawInteraction);
            } else {
                this.drawActive = true;
                this.vectorLayer.getSource().clear();
                this.map.removeInteraction(this.drawInteraction);
                this.map.removeLayer(this.vectorLayer);
                if (this.coordinates) this.clearProfile()
            }
        }
    }
    onDrawActiveChange() {
        this.drawInteraction.setActive(this.drawActive);
    }

    generatePlot(lineFeature: Feature) {
        this.coordinates = lineFeature;

        this.manager.init(this.config, this.map);
        this.manager.setLine(lineFeature.clone().getGeometry().transform('EPSG:3857', 'EPSG:2169'));
        this.manager.clearBuffer();
        this.manager.getProfileByLOD([], 0, true, this.config.serverConfig.minLOD);
    }
    exportCsv() {
        const points = this.manager.utils.getFlatPointsByDistance(this.manager.profilePoints) || {};
        const csvData = this.manager.utils.getCSVData(points);
        let headerColumns = Object.keys(points[0]);
        headerColumns = headerColumns.map((column) => {
            return {'name': column};
        });
        saveCsv(csvData, {filename: 'export-lidar.csv'});
    }

    exportPng() {
        this.manager.utils.downloadProfileAsImageFile(getConfig().clientConfig);
    }

    /**
     * Clear profile from map
     */
    clearProfile(): void {
        this.vectorLayer.getSource().clear();
        this.coordinates = null;
        this.manager.clearBuffer();
    }

    /**
     * Reload and reset the plot to original extent for the current profile (reloads data)
     */
    resetPlot(): void {
        this.manager.clearBuffer();
        this.manager.getProfileByLOD([], 0, true, 0);
    }

    toggleMeasure(): void {
        this.measureActive = !this.measureActive;
        if (this.measureActive) {
            this.setMeasureActive();
        } else {
            this.clearMeasure();
        }
    }

    setMeasureActive(): void {
        if (!this.manager.measure) {
          throw new Error('Missing profile.measure');
        }
        this.manager.measure.clearMeasure();
        this.manager.measure.setMeasureActive();
    }

    clearMeasure(): void {
        if (!this.manager.measure) {
          throw new Error('Missing profile.measure');
        }
        this.measureActive = false;
        this.manager.measure.clearMeasure();
    }

    clearAll(): void {
        this.clearMeasure();
        this.vectorLayer.getSource().clear();
        this.manager.cartoHighlight.setPosition(undefined);
        this.manager.setLine(null);
        this.manager.clearBuffer();
        this.manager.clearRect();
    }

    render() {
        return html`
            <div>
                <p>
                    <button class="btn btn-default ${classMap({active: this.drawActive})}"
                        @click="${() => this.drawActive = !this.drawActive}">${i18next.t('Draw a lidar profile')}</button>
                </p>
                <p class="${classMap({hidden: !this.drawActive})}">
                    <em class="small">${i18next.t('Draw a line on the map to dislay the corresponding LIDAR profile. Double clic to confirm.')}</em>
                </p>
                <div class="${classMap({hidden: !this.coordinates})}">
                    <div>
                        <button class="btn btn-default" @click="${() => this.exportCsv()}">${i18next.t('Export CSV')}</button>
                        <button class="btn btn-default" @click="${() => this.exportPng()}">${i18next.t('Export PNG')}</button>
                        <button class="btn btn-default" @click=${() => this.resetPlot()}><span class="fa fa-refresh"></span></button>
                    </div>
                    <hr/>
                    <div>
                        <p>
                            <button
                                class="btn btn-default ${classMap({active: this.measureActive})}"
                                @click=${() => this.toggleMeasure()}
                                >
                                ${i18next.t('Take measure')}
                            </button>
                            <button
                                class="btn btn-default"
                                @click=${() => this.clearMeasure()}
                                >
                                <span class="fa fa-eraser"></span>
                            </button>
                        </p>
                        <p class="small">
                            ${i18next.t('Measure distances on the profile below.')}
                            <em>${i18next.t('(Deactivates zoom and pan on the profile!)')}</em>
                        </p>
                    </div>
                </div>
                <hr/>
                <div>
                    <div>${i18next.t('Classes')}</div>
                    ${Object.values(this.classifications).map((classification) =>
                html`
                    <div class="checkbox">
                        <label>
                            <input type="checkbox" @click=${() => this.toggleClassificationCheck(classification)} checked="${classification.visible === 1}">
                            <span>${classification.name[`${i18next.language}`]}</span>
                        </label>
                    </div>`)}
                </div>
            </div>
        `;
    }

    toggleClassificationCheck(classification) {
        classification.visible = (classification.visible + 1) % 2;
        this.manager.getProfileByLOD([], 0, true, this.config.serverConfig.minLOD);
    }

    createRenderRoot() {
        // no shadow dom
        return this;
    }
}
