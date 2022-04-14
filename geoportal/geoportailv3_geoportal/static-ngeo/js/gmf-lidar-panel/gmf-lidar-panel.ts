import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {html} from 'lit';
import i18next from 'i18next';

import DrawInteraction from 'ol/interaction/Draw.js';
import VectorSource from 'ol/source/Vector.js';
import VectorLayer from 'ol/layer/Vector.js';
import LineString from 'ol/geom/LineString';
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
        this.drawInteraction.on('drawend', (event) => {
            this.drawActive = false;
            this.coordinates = event.feature.getGeometry();
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

    exportCsv() {
        console.log("Export CSV :", this.coordinates);
        const format = new GeoJSON({
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326'
        })
        const lineFeature = format.readFeature( {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [
                        6.9495391845703125,
                        47.03175858136222
                    ],
                    [
                        6.9488525390625,
                        47.02309964439266
                    ],
                    [
                        6.960697174072266,
                        47.02228048303955
                    ],
                    [
                        6.963100433349609,
                        47.01537562362976
                    ]
                ]
            }
        })
        this.coordinates = lineFeature;
        console.log("Export CSV :", lineFeature);

        this.manager.init(getConfig(), window.map)
        this.manager.setLine(lineFeature.clone().getGeometry().transform('EPSG:3857', 'EPSG:2056'))
        this.manager.getProfileByLOD([], 0, true, getConfig().serverConfig.minLOD);
    }

    exportPng() {
        console.log("Export PNG :", this.coordinates);

    }

    resetProfiles() {
        this.vectorLayer.getSource().clear();
        this.coordinates = null;
    }

    render() {
        return html`
            <div>
                <button class="btn btn-default ${classMap({active: this.drawActive})}"
                        @click="${() => this.drawActive = !this.drawActive}">${i18next.t('Draw a lidar profile')}</button>
            </div>
            <div>
                <button class="btn btn-default" @click="${() => this.exportCsv()}">${i18next.t('Export CSV')}</button>
                <button class="btn btn-default" @click="${() => this.exportPng()}">${i18next.t('Export PNG')}</button>
            </div>
            <div>
                <button class="btn btn-default" @click="${() => this.resetProfiles()}">${i18next.t('Reset Profiles')}</button>
            </div>
        `;
    }

    createRenderRoot() {
        // no shadow dom
        return this;
    }
}
