/**
 * @fileoverview This file provides the "app-toggle-3d" component.
 *
 * Example:
 *
 * <app-toggle-3d><app-toggle-3d>
 */
import appModule from '../module.js';

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
    /**
     * @type {boolean}
     */
    this.isOpened = false;
  }
  /**
   * @export
   */
  toggleSelector() {
    this.isOpened = !this.isOpened;
  }

  toggleMesh() {
    this.manager.toggleMesh();
  }
  toggle3d() {
    this.manager.toggle3dTerrain()
  }

  is3dTerrainEnabled() {
    if (this.manager) {
      return this.manager.is3dTerrainEnabled();
    }
    return false;
  }
  isMeshEnabled() {
    if (this.manager) {
      return this.manager.isMeshEnabled();
    }
    return false;
  }
}


/**
 * @ngInject
 * @param {string} app3dbarTemplateUrl The template url.
 * @return {angular.Directive} The Directive Object Definition.
 */
const exports = function(app3dbarTemplateUrl) {
  return {
    restrict: 'E',
    scope: {},
    controller: Controller,
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: app3dbarTemplateUrl
  };
};

appModule.directive('appToggle3d', exports);


export default exports;
