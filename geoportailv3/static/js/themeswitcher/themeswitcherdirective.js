/**
 * @fileoverview This file provides the "themeswitcher" directive.
 * That directive is used to create the theme switcher in the page.
 *
 */
goog.provide('app.themeswitcher.themeswitcherDirective');

goog.require('app.module');


/**
 * @param {string} appThemeswitcherTemplateUrl Url to themes template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.themeswitcher.themeswitcherDirective = function(appThemeswitcherTemplateUrl) {
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


app.module.directive('appThemeswitcher', app.themeswitcher.themeswitcherDirective);
