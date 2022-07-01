/**
 * @fileoverview This file provides the "app-toggle-offline" component.
 *
 * Example:
 *
 * <app-toggle-offline><app-toggle-offline>
 */
 import appModule from '../module.js';

 class Controller {
 
   constructor() {
     /**
      * @type {boolean}
      */
     this.isOpened = false;
      /**
      * @type {boolean}
      */
      this.fullOfflineActive = false;
      /**
      * @type {boolean}
      */
      this.selectOfflineActive = false;
   }
   /**
    * @export
    */
   toggleSelector() {
     this.isOpened = !this.isOpened;
     if (!this.isOpened) {
      this.fullOfflineActive = false;
      this.selectOfflineActive = false;
     }
   }
 
   toggleFullOffline() {
      this.fullOfflineActive = !this.fullOfflineActive;
   }
   toggleSelectOffline() {
      this.selectOfflineActive = !this.selectOfflineActive;
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
     scope: {
      'map': '=appOfflinebarMap',
      'offlineMode': '=appOfflinebarOfflineMode'
    },
     controller: Controller,
     controllerAs: 'ctrl',
     bindToController: true,
     templateUrl: appOfflineBarTemplateUrl
   };
 };
 
 appModule.directive('appToggleOffline', exports);
 
 
 export default exports;
 