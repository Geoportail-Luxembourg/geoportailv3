/**
 * @fileoverview This file defines the Blank Layer service. This service
 * creates an empty layer and the corresponding spec.
 */
goog.provide('app.BlankLayer');

goog.require('app');
goog.require('ol.layer.Tile');


/**
 * @typedef {ol.layer.Tile}
 */
app.BlankLayer;


/**
 * The blank layer specifications.
 * @private
 */
app.blankLayer_ = new ol.layer.Tile();
app.blankLayer_.set('label', 'blank');

app.module.value('appBlankLayer', app.blankLayer_);
