/**
 * @fileoverview This file defines the Blank Layer service. This service
 * creates an empty layer and the corresponding spec.
 */
goog.provide('app.BlankLayer');

goog.require('app.module');
goog.require('ol.layer.Tile');


/**
 * @constructor
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @ngInject
 */
app.BlankLayer = function(gettextCatalog) {

  /**
   * @typedef {ol.layer.Tile}
   * @private
   */
  this.blankLayer_ = new ol.layer.Tile();
  var blankLabel = gettextCatalog.getString('blank');
  this.blankLayer_.set('label', blankLabel);
};


/**
 * Get the blank layer.
 * @return {ol.layer.Tile} The blank tile.
 */
app.BlankLayer.prototype.getLayer = function() {
  return this.blankLayer_;
};

app.module.service('appBlankLayer', app.BlankLayer);
