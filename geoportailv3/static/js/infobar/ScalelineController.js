/**
 * @module app.infobar.ScalelineController
 */
/**
 * @fileoverview This file provides a "scaleline" directive. This directive is
 * used to insert an OpenLayers ScaleLine control into the HTML page. It is
 * based on the "ngeo-control" directive.
 *
 * Example:
 *
 * <app-scaleline app-scaleline-map="::mainCtrl.map"></app-scaleline>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */

import appModule from '../module.js';
import olControlScaleLine from 'ol/control/ScaleLine.js';

/**
 * @ngInject
 * @constructor
 */
const exports = function() {
  /**
   * @type {ol.control.ScaleLine}
   */
  this['control'] = new olControlScaleLine();
};


appModule.controller('AppScalelineController',
    exports);


export default exports;
