/**
 * @fileoverview Provides a drawn features service.
 */

goog.module('app.draw.SelectedFeaturesService');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');
const olCollection = goog.require('ol.Collection');


/**
 * The selected features collection.
 * @private
 */
const value = new olCollection();

appModule.value('appSelectedFeatures', value);
