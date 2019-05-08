/**
 * @fileoverview This file provides the "themeswitcher" directive.
 * That directive is used to create the theme switcher in the page.
 *
 */
goog.module('app.themeswitcher.themeswitcherDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @param {string} appThemeswitcherTemplateUrl Url to themes template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
exports = function(appThemeswitcherTemplateUrl) {
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
