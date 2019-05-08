/**
 * @module app.themeswitcher.themeswitcherDirective
 */
/**
 * @fileoverview This file provides the "themeswitcher" directive.
 * That directive is used to create the theme switcher in the page.
 *
 */

import appModule from '../module.js';

/**
 * @param {string} appThemeswitcherTemplateUrl Url to themes template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
const exports = function(appThemeswitcherTemplateUrl) {
  return {
    restrict: 'E',
    controller: 'AppThemeswitcherController',
    scope: {
      'userOpen': '=appThemeswitcherUseropen',
      'map': '=appThemeswitcherMap'
    },
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appThemeswitcherTemplateUrl
  };
};


appModule.directive('appThemeswitcher', exports);


export default exports;
