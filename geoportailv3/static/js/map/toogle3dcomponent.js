/**
 * @fileoverview This file provides the "app-toggle-3d" component.
 *
 * Example:
 *
 * <app-toggle-3d><app-toggle-3d>
 */
goog.provide('app.toggle3d');

goog.require('app');
goog.require('ngeo.olcs.Service');

app.toggle3d = {
  /**
   * @constructor
   * @param {ngeo.olcs.Service} ngeoOlcsService The service.
   */
  controller: function Toggle3dController(ngeoOlcsService) {
    /**
     * @export
     */
    this.manager = ngeoOlcsService.getManager();
  },
  template: `
    <div class="ol-unselectable ol-control ol-toogle3d"
         ng-class="{active: $ctrl.manager && $ctrl.manager.is3dEnabled()}"
         ng-if="::$ctrl.manager">
      <button type="button" ng-click="$ctrl.manager.toggle3d()">3D</button>
    </div>`
};

angular.module('app').component('appToggle3d', app.toggle3d)
