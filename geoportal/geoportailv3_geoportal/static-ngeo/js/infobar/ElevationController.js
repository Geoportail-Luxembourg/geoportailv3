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
 * @param {angular.$http} $http The angular http service.
 * @param {ngeox.miscDebounce} ngeoDebounce ngeoDebounce service.
 * @param {app.GetElevation} appGetElevation Elevation service.
 */
const exports = function($http, ngeoDebounce, appGetElevation) {
  var map = this['map'];

  /**
   * @type {app.GetElevation}
   * @private
   */
  this.getElevation_ = appGetElevation;

  /**
   * @type {string}
   */
  this['elevation'] = '';

  // 2D
  map.on('pointermove', ngeoDebounce(function(e) {
    if (!this['active'] || !e.coordinate) {
      return;
    }
    this.getElevation_(e.coordinate).then(
      (elevation) => (this['elevation'] = elevation['formattedElevation'])
    );
  }, 300, true), this);
};


appModule.controller('AppElevationController',
    exports);


export default exports;
