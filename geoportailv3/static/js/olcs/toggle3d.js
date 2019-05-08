/**
 * @module app.olcs.toggle3d
 */
let exports = {};

/**
 * @fileoverview This file provides the "app-toggle-3d" component.
 *
 * Example:
 *
 * <app-toggle-3d><app-toggle-3d>
 */


class Controller {
  /**
   * @ngInject
   * @param {ngeo.olcs.Service} ngeoOlcsService The service.
   */
  constructor(ngeoOlcsService) {
    /**
     * @export
     */
    this.manager = ngeoOlcsService.getManager();
  }
}

const toggle3d = {
  controller: Controller,
  template: `
    <div class="ol-unselectable ol-control ol-toogle3d"
         ng-class="{active: $ctrl.manager && $ctrl.manager.is3dEnabled()}"
         ng-if="::$ctrl.manager">
      <button type="button" ng-click="$ctrl.manager.toggle3d()">3D</button>
    </div>`
};

angular.module('app').component('appToggle3d', toggle3d);


export default exports;
