/**
 * @fileoverview Provides a drawn features service.
 */

goog.provide('app.draw.SelectedFeatures');

goog.require('app.module');
goog.require('ol.Collection');


/**
 * @typedef {ol.Collection<ol.Feature>}
 */
app.draw.SelectedFeatures;


/**
 * The selected features collection.
 * @private
 */
app.draw.SelectedFeatures_ = new ol.Collection();

app.module.value('appSelectedFeatures', app.draw.SelectedFeatures_);
