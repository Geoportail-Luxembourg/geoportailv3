import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {html} from 'lit';
import i18next from 'i18next';
import Style from 'ol/style/Style';
import olStyleCircle from 'ol/style/Circle.js';
import olStyleFill from 'ol/style/Fill.js';
import olGeomPolygon from 'ol/geom/Polygon';
import Stroke from 'ol/style/Stroke';
import DrawInteraction from 'ol/interaction/Draw.js';
import VectorSource from 'ol/source/Vector.js';
import VectorLayer from 'ol/layer/Vector.js';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON'
import {LuxBaseElement} from '../LuxBaseElement';
import {LidarManager} from '../../ngeo/contribs/gmf/src/lidarprofile/Manager';
import { getConfig } from '../../../lidarConfig'
import saveCsv from 'save-csv/save-csv.min';
import {transform} from 'ol/proj.js';
import {fromExtent} from 'ol/geom/Polygon';
import LinearRing from 'ol/geom/LinearRing';
import Fill from 'ol/style/Fill.js';

@customElement('gmf-lidar-panel')
export class GmfLidarPanel extends LuxBaseElement {
    @property({type: Object}) map;

    @property({type: Boolean})
    active: boolean = false;

    @property({type: Boolean})
    drawActive: boolean = true;

    @property({type: String})
    url;

    @property({type: Object})
    config: object = getConfig();

    @property({type: Boolean})
    measureActive: boolean = false;

    @property({type: Number})
    profileWidth: number = 5;

    private classifications: [] = this.config.serverConfig.classification_colors;

    private drawInteraction: DrawInteraction;
    private vectorLayer: VectorLayer;
    private coordinates: LineString;
    private manager: LidarManager;
    constructor() {
        super();
        this.manager = new LidarManager()
        this.manager.width = this.profileWidth;
        this.lineStyle = new Style({
            fill: new Fill({color: 'rgba(255,204,51,0.5)'}),
            stroke: new Stroke({
                color: 'rgba(255,204,51,0.5)',
                lineCap: 'square'
            })
        });
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
            if (this.coordinates) this.clearProfile()
        });
        this.drawInteraction.on('drawend', (event) => {
            this.drawActive = false;
            this.coordinates = event.feature.getGeometry();
            this.drawRectangles(event.feature.clone().getGeometry());
            event.feature.setStyle(this.createStyleFunction());
            this.generatePlot(event.feature);
        });
    }
    drawRectangles(line) {
      let coords = line.getCoordinates();
      for (let i = 0; i < coords.length - 1; i++) {
        let p1 = transform(coords[i], this.map.getView().getProjection(), 'EPSG:2169');
        let p2 = transform(coords[i+1], this.map.getView().getProjection(), 'EPSG:2169');
        let rectangle = this.getRectangle(p1, p2, this.profileWidth/2);
        let rectangle3857 = rectangle.transform('EPSG:2169', this.map.getView().getProjection());
        var pointStyle = new Style({
          image: new olStyleCircle({
            radius: 3,
            fill: new olStyleFill({color: '#000000'})
          })
        });
        var f1 = new Feature({geometry:rectangle3857});
        f1.setStyle(this.createStyleFunction());
        this.vectorLayer.getSource().addFeature(f1);
      }
    }
    getRectangle(p1, p2, d) {
      let x1 = p1[0];
      let y1 = p1[1];
      let x2 = p2[0];
      let y2 = p2[1];
      // Compute the slope
      let m = (x2 - x1) / (y2 - y1);

      let dy = Math.sqrt(Math.pow(d,2)/(Math.pow(m,2)+1));
      let dx = -m * dy;
      let x3 = x1 + dy;
      let y3 = y1 + dx;
      let x4 = x2 - dy;
      let y4 = y2 - dx;
      let x5 = x1 - dy;
      let y5 = y1 - dx;
      let x6 = x2 + dy;
      let y6 = y2 + dx;
      return new olGeomPolygon([[[x3,y3], [x5,y5], [x4,y4], [x6,y6], [x3, y3]]]);
    }

    createStyleFunction() {
      return function(feature, resolution) {
        //this.lineStyle.getStroke().setWidth(this.profileWidth / this.map.getView().getResolution());
        return this.lineStyle;
      }.bind(this)
    }
    changeWidth(event) {
      this.profileWidth = event.target.value;
      this.manager.width = this.profileWidth;
      this.vectorLayer.getSource().clear();
      this.drawRectangles(this.coordinates.clone().getGeometry());
      this.resetPlot();
    }

    updated(changedProperties: Map<string, any>) {
        this.config.pytreeLidarprofileJsonUrl = this.url;
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
        this.manager.clearBuffer();
        this.manager.init(this.config, this.map);
        this.manager.setLine(lineFeature.clone().getGeometry().transform('EPSG:3857', 'EPSG:2169'));
        this.manager.getProfileByLOD([], 0, true, this.config.serverConfig.minLOD, false, this.profileWidth);
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
    exportLas(): void {
      this.manager.getProfileByLOD([], 0, true, 0, true, this.profileWidth);
    }
    /**
     * Reload and reset the plot to original extent for the current profile (reloads data)
     */
    resetPlot(): void {
        this.manager.clearBuffer();
        this.manager.getProfileByLOD([], 0, true, 0, false, this.profileWidth);
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
                <p>
                ${i18next.t('Profile width')} <input type="number" width = 5 min="0" max="100" value="${this.profileWidth}" @change="${(event) => this.changeWidth(event)}">
                </p>
                <p class="${classMap({hidden: !this.drawActive})}">
                    <em class="small">${i18next.t('Draw a line on the map to dislay the corresponding LIDAR profile. Double clic to confirm.')}</em>
                </p>
                <div class="${classMap({hidden: !this.coordinates})}">
                    <div>
                        <button class="btn btn-default" @click="${() => this.exportCsv()}">${i18next.t('Export CSV')}</button>
                        <button class="btn btn-default" @click="${() => this.exportPng()}">${i18next.t('Export PNG')}</button>
                        <button class="btn btn-default" @click="${() => this.exportLas()}">${i18next.t('Export LAS')}</button>
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
        this.manager.getProfileByLOD([], 0, true, this.config.serverConfig.minLOD, false, this.profileWidth);
    }

    createRenderRoot() {
        // no shadow dom
        return this;
    }
}
