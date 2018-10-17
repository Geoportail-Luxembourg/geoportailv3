goog.provide('app.layerinfo.LayerinfoController');

goog.require('app.module');


/**
 * @constructor
 * @param {app.layerinfo.ShowLayerinfo} appShowLayerinfo app.layerinfo.ShowLayerinfo service.
 * @ngInject
 * @export
 */
app.layerinfo.LayerinfoController = function(appShowLayerinfo) {
  /**
   * @private
   */
  this.showLayerInfo_ = appShowLayerinfo;
};


/**
 * @export
 */
app.layerinfo.LayerinfoController.prototype.getInfo = function() {
  this.showLayerInfo_(this['layer']);
};


app.module.controller('AppLayerinfoController', app.layerinfo.LayerinfoController);
