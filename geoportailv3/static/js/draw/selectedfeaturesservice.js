/**
 * @fileoverview Provides a drawn features service.
 */

goog.provide('app.SelectedFeatures');

goog.require('app.module');
goog.require('ol.Collection');


/**
 * @typedef {ol.Collection<ol.Feature>}
 */
app.SelectedFeatures;


/**
 * The selected features collection.
 * @private
 */
app.selectedFeatures_ = new ol.Collection();

app.module.value('appSelectedFeatures', app.selectedFeatures_);
