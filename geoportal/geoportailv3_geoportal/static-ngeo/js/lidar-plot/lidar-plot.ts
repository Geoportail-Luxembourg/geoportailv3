import {customElement, property} from 'lit/decorators.js';
import {html} from 'lit';

import {LuxBaseElement} from '../LuxBaseElement';
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';

proj4.defs("EPSG:2056","+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");

register(proj4);


@customElement('lidar-plot')
export class LidarPlot extends LuxBaseElement {
    @property()
    active: string;

    constructor() {
        super();
    }
    render() {
        return html`
            <div class="gmf-lidarprofile-container" class="panel">
                <div class="lidarprofile">
                    <div class="lidar-error"></div>
                    <canvas class="lidar-canvas"></canvas>
                    <svg class="lidar-svg" style="fill: #ffff00;position:absolute;z-index:1;"></svg>
                </div>
                <div class="lidar-legend">
                    <div class="width-info"></div>
                    <div class="lod-info"></div>
                    <div class="lidar-info"></div>
                </div>
            </div>
        `;
    }

    createRenderRoot() {
        // no shadow dom
        return this;
    }
}
