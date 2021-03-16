/**
 * @module app.layerinfo.LayerinfoController
 */
import appModule from '../module.js';

/**
 * @constructor
 * @param {app.layerinfo.ShowLayerinfo} appShowLayerinfo app.layerinfo.ShowLayerinfo service.
 * @ngInject
 * @export
 */
const exports = function(appShowLayerinfo) {
  /**
   * @private
   */
  this.showLayerInfo_ = appShowLayerinfo;
};


/**
 * @export
 */
exports.prototype.getInfo = function() {
  this.showLayerInfo_(this['layer']);
};


appModule.controller('AppLayerinfoController', exports);


export default exports;
