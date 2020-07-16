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
   * @param {app.MvtStylingService} appMvtStylingService Mvt styling service.
   */
  constructor(ngeoOlcsService, appMvtStylingService) {
    /**
     * @export
     */
    this.manager = ngeoOlcsService.getManager();

    /**
     * @type{app.Mvtstyling}
     * @private
     */
    this.appMvtStylingService_ = appMvtStylingService;
  }

  luxToggle3d() {
        if (!this.manager.ol3d.getEnabled()) {
          this.appMvtStylingService_.publishIfSerial(this.map);
        } else {
          this.appMvtStylingService_.unpublishIfSerial(this.map);
        }
        return this.manager.toggle3d();
  }
}

const toggle3d = {
  controller: Controller,
  template: `
    <div class="ol-unselectable ol-control ol-toogle3d"
         ng-class="{active: $ctrl.manager && $ctrl.manager.is3dEnabled()}"
         ng-if="::$ctrl.manager">
      <button type="button" ng-click="$ctrl.luxToggle3d()">3D</button>
    </div>`,
    bindings: {
      map: '='
    }
};

angular.module('Appmain').component('appToggle3d', toggle3d);


export default exports;
