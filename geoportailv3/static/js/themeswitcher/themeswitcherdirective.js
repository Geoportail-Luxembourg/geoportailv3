/**
 * @fileoverview This file provides the "themeswitcher" directive.
 * That directive is used to create the theme switcher in the page.
 *
 */
goog.provide('app.themeswitcherDirective');

goog.require('app');
goog.require('app.Themes');
goog.require('app.ThemesEventType');
goog.require('goog.events');


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

  /**
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

  goog.events.listen(appThemes, app.ThemesEventType.LOAD,
      /**
       * @param {goog.events.Event} evt Event.
       */
      function(evt) {
        this.setThemes_();
      }, undefined, this);

};


/**
 * @private
 */
app.ThemeswitcherController.prototype.setThemes_ = function() {
  this.appThemes_.getThemesObject().then(goog.bind(
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
