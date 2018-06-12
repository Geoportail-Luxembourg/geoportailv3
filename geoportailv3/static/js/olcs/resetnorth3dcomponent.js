/**
 * @fileoverview This file provides the "app-resetnorth-3d" component.
 *
 * Example:
 *
 * <app-resetnorth-3d><app-resetnorth-3d>
 */
goog.module('app.olcs.resetnorth');

goog.require('app');
goog.require('ngeo.olcs.Service');

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

  resetnorth() {
    this.manager.setHeading(this.manager.getHeading());
  }
}

const resetnorth3d = {
  controller: Controller,
  template: `
    <div class="ol-unselectable ol-control ol-resetnorth"
         ng-if="$ctrl.manager && $ctrl.manager.is3dEnabled()">
      <button type="button" ng-click="$ctrl.resetnorth()" ng-attr-title="{{'Caméra vers le nord'|translate}}">
        &#8679;
      </button>
    </div>`
};

angular.module('app').component('appResetnorth3d', resetnorth3d);
