import {customElement, property} from 'lit/decorators.js';
import {html} from 'lit';

import {LuxBaseElement} from '../LuxBaseElement';


@customElement('lidar-plot')
export class LidarPlot extends LuxBaseElement {
    @property()
    active: boolean;

    constructor() {
        super();
    }

    //clear legend and profile when opening plot
    updated(changedProperties: Map<string, any>) {
        if (changedProperties.has('active') && this.active === true) {
            document.querySelector('.lidar-legend').innerHTML = this.legendContent();
            document.querySelector('.lidarprofile').innerHTML = this.profileContent();
        }
    }

    legendContent() {
        return `<div class="width-info"></div>
            <div class="lod-info"></div>
            <div class="lidar-info"></div>`
    }

    profileContent() {
        return `<div class="lidar-error"></div>
            <canvas class="lidar-canvas"></canvas>
            <svg class="lidar-svg" style="fill: #ffff00;position:absolute;z-index:1;"></svg>`
    }

    render() {
        return html`
            <div class="gmf-lidarprofile-container" class="panel">
                <div class="lidar-legend">
                </div>
                <div class="lidarprofile">
                </div>
            </div>
        `;
    }

    createRenderRoot() {
        // no shadow dom
        return this;
    }
}
