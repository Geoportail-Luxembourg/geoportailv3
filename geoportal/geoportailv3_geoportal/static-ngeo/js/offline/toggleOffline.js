/**
 * @fileoverview This file provides the "app-toggle-offline" component.
 *
 * Example:
 *
 * <app-toggle-offline><app-toggle-offline>
 */
 import appModule from '../module.js';

 class Controller {
 
    /**
   * @ngInject
   * @param {app.offline.Bar} appOfflineBar The service.
   */
  constructor(appOfflineBar) {
    this.offlineBar = appOfflineBar;
 }
   /**
    * @export
    */
   toggleBar() {
     this.offlineBar.toggleBar();
   }

   isBarOpen() {
    return this.offlineBar.isBarOpen();
  }
 }
 
 
 /**
  * @ngInject
  * @param {string} appOfflineBarTemplateUrl The template url.
  * @return {angular.Directive} The Directive Object Definition.
  */
 const exports = function(appOfflineBarTemplateUrl) {
   return {
     restrict: 'E',
     scope: {},
     controller: Controller,
     controllerAs: 'ctrl',
     bindToController: true,
     templateUrl: appOfflineBarTemplateUrl
   };
 };
 
 appModule.directive('appToggleOffline', exports);
 
 
 export default exports;
 