goog.module('app.layerinfo.LayerinfoController');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @constructor
 * @param {app.layerinfo.ShowLayerinfo} appShowLayerinfo app.layerinfo.ShowLayerinfo service.
 * @ngInject
 * @export
 */
exports = function(appShowLayerinfo) {
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
