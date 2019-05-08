/**
 * @module app.share.ShareDirective
 */
/**
 * @fileoverview This file provides a list of social sharing options.
 * This directive is used
 * to create a sharing panel in the page.
 *
 * Example:
 *
 * <app-share app-share-active=":mainCtrl.active"></app-share>
 *
 */

import appModule from '../module.js';

/**
 * @param {string} appShareTemplateUrl Url to share template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appShareTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'active': '=appShareActive',
      'activeMymaps': '=appShareActiveMymaps',
      'showLongUrl': '=appShareShowLongUrl'
    },
    controller: 'AppShareController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appShareTemplateUrl
  };
};

appModule.directive('appShare', exports);


export default exports;
