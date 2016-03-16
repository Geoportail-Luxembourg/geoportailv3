/**
 * @fileoverview This file defines the Blank Layer service. This service
 * creates an empty layer and the corresponding spec.
 */
goog.provide('app.BlankLayer');

goog.require('app');
goog.require('ol.layer.Tile');



/**
 * @constructor
 * @param {gettext} gettext Gettext service.
 * @ngInject
 */
app.BlankLayer = function(gettext) {

  /**
   * @typedef {ol.layer.Tile}
   * @private
   */
  this.blankLayer_ = new ol.layer.Tile();
  var blankLabel = gettext('blank');
  this.blankLayer_.set('label', blankLabel);
};


/**
 * Get the blank layer.
 * @return {ol.layer.Tile}
 */
app.BlankLayer.prototype.getLayer = function() {
  return this.blankLayer_;
};

app.module.service('appBlankLayer', app.BlankLayer);
