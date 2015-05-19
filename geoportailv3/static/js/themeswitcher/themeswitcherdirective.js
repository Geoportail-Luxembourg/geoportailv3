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
goog.require('ngeo.Location');


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
 * @param {ngeo.Location} ngeoLocation ngeo Location service.
 * @param {app.Themes} appThemes Themes service.
 * @export
 * @ngInject
 */
app.ThemeswitcherController = function(ngeoLocation, appThemes) {

  /**
   * @type {string}
   */
  this['currentTheme'] = app.ThemeswitcherController.DEFAULT_THEME_;

  /**
   * @type {ngeo.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

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

  // Get the theme from the URL if specified, otherwise we use the default
  // theme and add it to the URL.
  var pathElements = ngeoLocation.getPath().split('/');
  if (app.ThemeswitcherController.themeInUrl(pathElements)) {
    this['currentTheme'] = pathElements[pathElements.length - 1];
  } else {
    this.setLocationPath_(this['currentTheme']);
  }
};


/**
 * @const
 * @private
 */
app.ThemeswitcherController.DEFAULT_THEME_ = 'main';


/**
 * Return true if there is a theme specified in the URL path.
 * @param {Array.<string>} pathElements Array of path elements.
 * @return {boolean} theme in path.
 */
app.ThemeswitcherController.themeInUrl = function(pathElements) {
  var indexOfTheme = pathElements.indexOf('theme');
  return indexOfTheme >= 0 &&
      pathElements.indexOf('theme') == pathElements.length - 2;
};


/**
 * @param {string} themeId The theme id to set in the path of the URL.
 * @private
 */
app.ThemeswitcherController.prototype.setLocationPath_ = function(themeId) {
  var pathElements = this.ngeoLocation_.getPath().split('/');
  goog.asserts.assert(pathElements.length > 1);
  if (pathElements[pathElements.length - 1] === '') {
    // case where the path is just "/"
    pathElements.splice(pathElements.length - 1);
  }
  if (app.ThemeswitcherController.themeInUrl(pathElements)) {
    pathElements[pathElements.length - 1] = themeId;
  } else {
    pathElements.push('theme', themeId);
  }
  this.ngeoLocation_.setPath(pathElements.join('/'));
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
        // Check whether the current theme is valid; and if it's not,
        // use the default theme. A theme is valid if it is present in
        // the list of themes.
        var themeIndex = goog.array.findIndex(themes, function(theme) {
          return theme['name'] == this['currentTheme'];
        }, this);
        if (themeIndex < 0) {
          this.switchTheme(app.ThemeswitcherController.DEFAULT_THEME_);
        }
      }, this));
};


/**
 * @param {string} themeId The id of the theme.
 * @export
 */
app.ThemeswitcherController.prototype.switchTheme = function(themeId) {
  this['currentTheme'] = themeId;
  this.setLocationPath_(themeId);
};


app.module.controller('AppThemeswitcherController',
    app.ThemeswitcherController);
