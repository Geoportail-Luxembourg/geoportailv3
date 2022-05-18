/**
 * @module app.infobar.ElevationController
 */
/**
 * @fileoverview This file provides a "elevation" directive. This directive is
 * used to insert Elevation information into the HTML page.
 * Example:
 *
 * <app-elevation app-elevation-active="mainCtrl.infobarOpen"
 *     app-elevation-map="::mainCtrl.map"></app-elevation>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */

import appModule from '../module.js';

/**
 * @ngInject
 * @constructor
 * @param {ngeox.miscDebounce} ngeoDebounce ngeoDebounce service.
 * @param {app.GetElevation} appGetElevation Elevation service.
 */
const exports = function(ngeoDebounce, appGetElevation) {
  /**
   * @type {app.GetElevation}
   * @private
   */
  this.getElevation_ = appGetElevation;

  this.ngeoDebounce_ = ngeoDebounce;

  /**
   * @type {string}
   */
  this['elevation'] = '';

};

exports.prototype.$onInit = function() {
  this.map_ = this['map'];
  // 2D
  this.map_.on('pointermove', this.ngeoDebounce_((e) => {
    if (!this['active'] || !e.coordinate) {
      return;
    }
    this.getElevation_(e.coordinate).then(
      elevation => this['elevation'] = elevation['formattedElevation']
    );
  }, 300, true));

};

appModule.controller('AppElevationController',
    exports);


export default exports;
