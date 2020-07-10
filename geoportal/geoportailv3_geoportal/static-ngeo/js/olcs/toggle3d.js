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
   * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer manager.
   * @param {app.MvtStylingService} appMvtStylingService Mvt styling service.
   */
  constructor(ngeoOlcsService, ngeoBackgroundLayerMgr, appMvtStylingService) {
    /**
     * @export
     */
    this.manager = ngeoOlcsService.getManager();

    /**
     * @type{app.Mvtstyling}
     * @private
     */
    this.appMvtStylingService_ = appMvtStylingService;

    /**
     * @type {ngeo.map.BackgroundLayerMgr}
     * @private
     */
    this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;
  }

  luxToggle3d() {
      const serial = new URLSearchParams(window.location.search).get('serial');
      if (serial) {
        const isValidUUIDv4Regex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/gi;

        // check if simple/medium styling
        if (serial.match(isValidUUIDv4Regex) === null) {
          const bgLayer = this.backgroundLayerMgr_.get(this.map);
          const mbMap =  bgLayer.getMapBoxMap();
          const data = JSON.stringify(mbMap.getStyle());
          if (this.manager.isCurrentlyEnabled) {
            return this.appMvtStylingService_.publishStyle(bgLayer, data).then(() => {
              return this.manager.toggle3d();
            });
          } else {
            return this.appMvtStylingService_.unpublishStyle(bgLayer).then(() => {
              return this.manager.toggle3d();
            });
          }
        }
      } else {
        this.manager.toggle3d();
      }
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
