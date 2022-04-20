import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {html} from 'lit';
import i18next from 'i18next';
import DrawInteraction from 'ol/interaction/Draw.js';
import VectorSource from 'ol/source/Vector.js';
import VectorLayer from 'ol/layer/Vector.js';
import LineString from 'ol/geom/LineString';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON'
import {LuxBaseElement} from '../LuxBaseElement';
import {LidarManager} from '../../ngeo/contribs/gmf/src/lidarprofile/Manager';
import { getConfig } from '../../ngeo/contribs/gmf/src/lidarprofile/config'
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';

proj4.defs("EPSG:2056","+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");

register(proj4);


@customElement('gmf-lidar-panel')
export class GmfLidarPanel extends LuxBaseElement {

    @property({type: Boolean})
    active: boolean = false;

    @property({type: Boolean})
    drawActive: boolean = false;

    @property({type: Object})
    config: object = getConfig();

    private classifications: [] = this.config.serverConfig.classification_colors;

    private drawInteraction: DrawInteraction;
    private vectorLayer: VectorLayer;
    private coordinates: LineString;
    private manager: LidarManager;
    constructor() {
        super();
        this.manager = new LidarManager()
        this.vectorLayer = new VectorLayer({
            source: new VectorSource(),
            zIndex: 1000
        });
        this.drawInteraction = new DrawInteraction({
            source: this.vectorLayer.getSource(),
            type: 'LineString'
        });
        this.drawInteraction.setActive(false);
        this.drawInteraction.on('drawstart', (event) => {
            if (this.coordinates) this.resetProfiles()
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
                if (this.coordinates) this.resetProfiles()
            }
        }
    }
    onDrawActiveChange() {
        this.drawInteraction.setActive(this.drawActive);
    }

    generatePlot(lineFeature: Feature) {
        // const format = new GeoJSON({
        //     featureProjection: 'EPSG:3857',
        //     dataProjection: 'EPSG:4326'
        // })
        // const lineFeature = format.readFeature( {
        //     "type": "Feature",
        //     "properties": {},
        //     "geometry": {
        //         "type": "LineString",
        //         "coordinates": [
        //             [
        //                 6.9495391845703125,
        //                 47.03175858136222
        //             ],
        //             [
        //                 6.9488525390625,
        //                 47.02309964439266
        //             ],
        //             [
        //                 6.960697174072266,
        //                 47.02228048303955
        //             ],
        //             [
        //                 6.963100433349609,
        //                 47.01537562362976
        //             ]
        //         ]
        //     }
        // })
        // this.coordinates = lineFeature;
        // console.log("Export CSV :", lineFeature);

        this.manager.init(this.config, window.map);
        this.manager.setLine(lineFeature.clone().getGeometry().transform('EPSG:3857', 'EPSG:2056'));
        this.manager.clearBuffer();
        this.manager.getProfileByLOD([], 0, true, this.config.serverConfig.minLOD);
    }
    exportCsv() {
        console.log("Export CSV :");
        const points = this.manager.utils.getFlatPointsByDistance(this.manager.profilePoints) || {};
        const csvData = this.manager.utils.getCSVData(points);
        let headerColumns = Object.keys(points[0]);
        headerColumns = headerColumns.map((column) => {
            return {'name': column};
        });

    }

    exportPng() {
        console.log("Export PNG :", this.coordinates);
        this.manager.utils.downloadProfileAsImageFile(getConfig().clientConfig);
    }

    resetProfiles() {
        this.vectorLayer.getSource().clear();
        this.coordinates = null;
        this.manager.clearBuffer();
        this.manager.getProfileByLOD([], 0, true, 0);
    }

    render() {
        return html`
            <div>
                <button class="btn btn-default ${classMap({active: this.drawActive})}"
                        @click="${() => this.drawActive = !this.drawActive}">${i18next.t('Draw a lidar profile')}</button>
            </div>
            <div>
                <div>Classes</div>
                  ${Object.values(this.classifications).map((classification) =>
            html`
                <div class="checkbox">
                    <label>
                        <input type="checkbox" @click=${() => this.toggleClassificationCheck(classification)} checked="${classification.visible === 1}">
                        <span translate>${classification.name}</span>
                    </label>
                </div>`)}
            </div>
            <div>
                <button class="btn btn-default" @click="${() => this.exportCsv()}">${i18next.t('Export CSV')}</button>
                <button class="btn btn-default" @click="${() => this.exportPng()}">${i18next.t('Export PNG')}</button>
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
