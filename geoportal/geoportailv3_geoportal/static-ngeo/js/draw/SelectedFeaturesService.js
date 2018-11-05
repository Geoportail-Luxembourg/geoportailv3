/**
 * @module app.draw.SelectedFeaturesService
 */
let exports = {};

/**
 * @fileoverview Provides a drawn features service.
 */

import appModule from '../module.js';
import olCollection from 'ol/Collection.js';


/**
 * The selected features collection.
 * @private
 */
const value = new olCollection();

appModule.value('appSelectedFeatures', value);


export default exports;
