/**
 * @fileoverview This file provides the "app-toggle-3d" component.
 *
 * Example:
 *
 * <app-toggle-3d app-toggle-3d-map="::mainCtrl.map"><app-toggle-3d>
 */
import appModule from '../module.js';
import { toLonLat } from 'ol/proj';

class Controller {

  /**
   * @ngInject
   * @param {Window} $window The window service.
   * @param {angular.Scope} $scope The scope.
   */
  constructor($window, $scope) {
    /**
     * @private
     * @type {Window}
     */
    this.window_ = $window;

    /**
     * @private
     * @type {angular.Scope}
     */
    this.scope_ = $scope;

    /**
     * @private
     * @type {ol.Map}
     */
    this.map_ = null;

    /**
     * @type {string}
     */
    this.luxVcsUrl = 'https://3d.geoportail.lu'; // Adjust to your actual URL

    /**
     * @type {Array<string>}
     */
    this.luxVcsModules = ['catalogConfig', 'LuxConfig'];

    /**
     * @type {Object<number, number>}
     */
    this.zoomToCesiumAltitude = {
      9: 350000,
      10: 180000,
      11: 100000,
      12: 40000,
      13: 25000,
      14: 9000,
      15: 6000,
      16: 3500,
      17: 1900,
      18: 900,
      19: 600
    };

    /**
     * @type {Array<number>}
     */
    this.luxVcsCoordinates = [6.13, 49.61];
  }

  /**
   * Initialize the controller
   * @export
   */
  $onInit() {
    // Set window name for 3D viewer reference
    this.window_.name = 'lux2d';
    this.map_ = this['map'];  // this['map'] is set by bindToController
  }

  /**
   * Get lon/lat from map center
   * @private
   * @return {Array<number>}
   */
  getLonLatFromXY_() {
    if (!this.map_) {
      return this.luxVcsCoordinates;
    }
    
    const view = this.map_.getView();
    const center = view.getCenter();
    
    if (!center) {
      return this.luxVcsCoordinates;
    }
    
    return toLonLat(center);
  }

  /**
   * Get altitude from zoom level
   * @private
   * @param {number} zoom
   * @return {number}
   */
  getAltFromZoom_(zoom) {
    const minZoom = 9;
    const maxZoom = 19;
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, Math.round(zoom)));
    
    return this.zoomToCesiumAltitude[clampedZoom] || 40000;
  }

  /**
   * Get heading from map rotation
   * @private
   * @param {number} rotation
   * @return {number}
   */
  getHeadingFromRotation_(rotation) {
    const degrees = -((rotation * (180 / Math.PI) + 360) % 360);
    return Math.round(degrees);
  }

  /**
   * Get selected layers for 3D viewer
   * @private
   * @return {string}
   */
  getSelectedLayers_() {
    const layers = [];
    
    if (this.map_) {
      this.map_.getLayers().forEach((layer) => {
        const name = layer.get('layer_name');
        if (name) {
          layers.push(JSON.stringify([name, 1, 0]));
        }
      });
    }
    
    return layers.join(',');
  }

  
  /**
   * Generate 3D viewer URL
   * @export
   * @return {string}
   */
  getLinkTo3dMap() {
    if (!this.map_) {
      return this.luxVcsUrl;
    }

    const view = this.map_.getView();
    const [lon, lat] = this.getLonLatFromXY_();
    const zoom = view.getZoom() || 12;
    const altitude = this.getAltFromZoom_(zoom);
    const rotation = view.getRotation() || 0;
    const heading = this.getHeadingFromRotation_(rotation);
    const selectedLayers = this.getSelectedLayers_();

    // VCS state pattern:
    // [[[lon,lat,altitude],[lon,lat,altitude],300,heading,-90,0],"cesium",["modules"],[layers],[],0]
    const state = `[[[${[lon, lat, altitude].join(',')}],[${[lon, lat, altitude].join(',')}],300,${heading},-90,0],"cesium",["${this.luxVcsModules.join('","')}"],[${selectedLayers}],[],0]`;

    return `${this.luxVcsUrl}?state=${encodeURIComponent(state)}`;
  }

  /**
   * Open 3D viewer in new tab
   * @export
   */
  open3dViewer() {
    const url = this.getLinkTo3dMap();
    this.window_.open(url, 'lux3d');
  }
}

/**
 * @ngInject
 * @param {string} app3dbarTemplateUrl The template url.
 * @return {angular.Directive} The Directive Object Definition.
 */
const exports = function(app3dbarTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appToggle3dMap'
    },
    controller: Controller,
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: app3dbarTemplateUrl
  };
};

appModule.directive('appToggle3d', exports);

export default exports;
