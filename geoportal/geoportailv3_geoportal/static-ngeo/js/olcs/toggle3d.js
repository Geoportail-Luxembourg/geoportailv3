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
  };

  toggleMesh() {
    if (this.manager.getMode() === '3D' && this.manager.is3dEnabled()) {
      this.manager.setMode('MESH');
    } else {
      this.manager.toggleMode('MESH');
    }
  };
  toggle3d() {
    if (this.manager.getMode() === 'MESH' && this.manager.is3dEnabled()) {
      this.manager.setMode('3D');
    } else {
      this.manager.toggleMode('3D');
    }
  };
  is3dEnabled() {
    if (this.manager && this.manager.getMode() === '3D') {
     return this.manager.is3dEnabled();
    }
    return false;
  };
  isMeshEnabled() {
    if (this.manager && this.manager.getMode() === 'MESH') {
      return this.manager.is3dEnabled();
    }
    return false;
  };
};


/**
 * @ngInject
 * @param {string} appInfobarTemplateUrl The template url.
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
