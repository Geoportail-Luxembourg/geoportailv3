/**
 * @module app.backgroundlayer.BackgroundlayerController
 */
/**
 * @fileoverview This file provides the "backgroundlayer" directive. This
 * directive is used to create a dropdown for selecting the map's background
 * layer. This directive is based on Bootstrap's "dropdown" component, and
 * on the "ngeoBackgroundLayerMgr" service.
 *
 * Example:
 *
 * <app-backgroundlayer app-backgroundlayer-map="::mainCtrl.map">
 * </app-backgroundlayer>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */

import appModule from '../module.js';
import {listen} from 'ol/events.js';


/**
 * @typedef {import('ol/layer/Base').default} BaseLayer
 */


/**
 * @constructor
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer manager.
 * @param {import('../Themes').default} appThemes The app themes.
 * @ngInject
 */
class Controller {
  constructor(ngeoBackgroundLayerMgr, appThemes) {
    /**
     * @type {ngeo.map.BackgroundLayerMgr}
     * @private
     */
    this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

    /**
     * @type {import('../Themes').default}
     */
    this.appThemes_ = appThemes;

    /**
     * @type {import('ol/layer/Base').default[]}
     */
    this.bgLayers;

    /**
     * @type {import('ol/layer/Base').default}
     */
    this.bgLayer;

    /**
     * @type {import('ol/Map').default}
     */
    this.map;

    /**
     * @type {boolean}
     */
    this.activeMvt;
  }


  $onInit() {
    this.appThemes_.getBgLayers(this.map).then(bgLayers => {
      this.bgLayers = bgLayers;
      this.bgLayer = this.backgroundLayerMgr_.get(this.map);
    });

    listen(this.backgroundLayerMgr_, 'change', evt => {
      /**
       * @type {BaseLayer}
       */
      const previous = evt.detail.previous;

      /**
       * @type {BaseLayer}
       */
      const current = evt.detail.current;

      if (previous) {
        previous.setVisible(false);
      }
      current.setVisible(true);
      this.bgLayer = current;

      this.activeMvt = this.bgLayer.getType() === 'GEOBLOCKS_MVT';
    });
  };

  /**
   * @param {BaseLayer} layer Layer.
   * @export
   */
  setLayer(layer) {
    this.bgLayer = layer;
    this.backgroundLayerMgr_.set(this.map, layer);
    this.activeMvt = this.bgLayer.getType() === 'GEOBLOCKS_MVT';
  };

};

appModule.controller('AppBackgroundlayerController', Controller);
export default Controller;
