/**
 * @fileoverview Provides a selected features service useful to share
 * information about the selected feature throughout the application.
 */

goog.provide('app.DrawnFeatures');

goog.require('app');
goog.require('ol.Collection');


/**
 * @typedef {ol.Collection<ol.Feature>}
 */
app.DrawnFeatures;


/**
 * The selected features collection.
 * @private
 */
app.drawnFeatures_ = new ol.Collection();

app.module.value('appDrawnFeatures', app.drawnFeatures_);
