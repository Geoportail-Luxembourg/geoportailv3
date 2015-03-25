/**
 * @fileoverview This file provides the "themeswitcher" directive.
 * That directive is used to create the theme switcher in the page.
 *
 */
goog.provide('app.themeswitcherDirective');

goog.require('app');
goog.require('app.Themes');


/**
 * @param {string} appThemeswitcherTemplateUrl Url to themes template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.themeswitcherDirective = function(appThemeswitcherTemplateUrl) {
  return {
    restrict: 'E',
    controller: 'AppThemeswitcherController',
    scope: {
      'currentTheme': '=appThemeswitcherCurrenttheme'
    },
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appThemeswitcherTemplateUrl
  };
};


app.module.directive('appThemeswitcher', app.themeswitcherDirective);



/**
 * @constructor
 * @param {app.Themes} appThemes Themes service.
 * @export
 * @ngInject
 */
app.ThemeswitcherController = function(appThemes) {

  appThemes.getThemesObject().then(goog.bind(
      /**
       * Keep only the themes dedicated to the theme switcher
       * @param {Array.<Object>} themes Array of theme objects.
       */
      function(themes) {
        this['themes'] = goog.array.filter(themes, function(object) {
          return 'true' == object['metadata']['display_in_switcher'];
        });
      }, this));

};


/**
 * @param {string} themeId The id of the theme.
 * @export
 */
app.ThemeswitcherController.prototype.switchTheme = function(themeId) {
  this['currentTheme'] = themeId;
};


app.module.controller('AppThemeswitcherController',
    app.ThemeswitcherController);
