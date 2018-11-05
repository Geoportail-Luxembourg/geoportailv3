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
import olEvents from 'ol/events.js';

/**
 * @constructor
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer
 *     manager.
 * @param {app.Themes} appThemes Themes service.
 * @export
 * @ngInject
 */
const exports = function(ngeoBackgroundLayerMgr, appThemes) {

  /**
   * @type {ngeo.map.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  appThemes.getBgLayers().then(
      /**
       * @param {Array.<Object>} bgLayers Array of background layer objects.
       */
      (function(bgLayers) {
        this['bgLayers'] = bgLayers;
        this['bgLayer'] = this['bgLayers'][0];
        this.setLayer(this['bgLayer']);
      }).bind(this));

  olEvents.listen(this.backgroundLayerMgr_, 'change',
      function() {
        this['bgLayer'] = this.backgroundLayerMgr_.get(this['map']);
      }, this);
};


/**
 * @param {ol.layer.Base} layer Layer.
 * @export
 */
exports.prototype.setLayer = function(layer) {
  this['bgLayer'] = layer;
  this.backgroundLayerMgr_.set(this['map'], layer);
};


appModule.controller('AppBackgroundlayerController',
    exports);


export default exports;
