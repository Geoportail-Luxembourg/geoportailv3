/**
 * @fileoverview This file provides the "themeswitcher" directive.
 * That directive is used to create the theme switcher in the page.
 *
 */
goog.provide('app.ThemeswitcherController');
goog.provide('app.themeswitcherDirective');

goog.require('app.module');
goog.require('app.ThemesEventType');
goog.require('goog.array');
goog.require('ol.events');


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
      'userOpen': '=appThemeswitcherUseropen',
      'map': '=appThemeswitcherMap'
    },
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appThemeswitcherTemplateUrl
  };
};


app.module.directive('appThemeswitcher', app.themeswitcherDirective);


/**
 * @constructor
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {ngeo.statemanager.Location} ngeoLocation ngeo Location service.
 * @param {app.Themes} appThemes Themes service.
 * @param {app.Theme} appTheme current theme service.
 * @param {app.Notify} appNotify Notify service.
 * @param {gettext} gettext Gettext service.
 * @export
 * @ngInject
 */
app.ThemeswitcherController = function(gettextCatalog, ngeoLocation,
    appThemes, appTheme, appNotify, gettext) {

  /**
   * @type {app.Theme}
   * @private
   */
  this.appTheme_ = appTheme;

  /**
   * @type {angularGettext.Catalog}
   * @private
   */
  this.translate_ = gettextCatalog;

  /**
   * @type {string}
   * @private
   */
  this.privateThemeMsg_ = gettext(
      'Ce thème est protégé. Veuillez vous connecter.');

  /**
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

  /**
   * @type {app.Notify}
   * @private
   */
  this.appNotify_ = appNotify;

  ol.events.listen(appThemes, app.ThemesEventType.LOAD,
      /**
       * @param {ol.events.Event} evt Event.
       */
      function(evt) {
        this.setThemes_();
      }, this);

  // Get the theme from the URL if specified, otherwise we use the default
  // theme and add it to the URL.
  var pathElements = ngeoLocation.getPath().split('/');
  if (this.appTheme_.themeInUrl(pathElements)) {
    this.switchTheme(decodeURIComponent(pathElements[pathElements.length - 1]));
  } else {
    this.switchTheme(this.appTheme_.getDefaultTheme());
  }
};


/**
 * Get the current theme.
 * @return {string} The current theme.
 * @export
 */
app.ThemeswitcherController.prototype.getCurrentTheme = function() {
  return this.appTheme_.getCurrentTheme();
};


/**
 * Encode the theme name.
 * @param {string} theme The theme to encode.
 * @return {string} The theme.
 * @export
 */
app.ThemeswitcherController.prototype.encodeThemeName = function(theme) {
  return this.appTheme_.encodeThemeName(theme);
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
        // Check whether the current theme is valid or is protected;
        // and if it's not, use the default theme.
        // A theme is valid if it is present in the list of themes.
        // A theme is protected if the related WS returns true
        var themeIndex = goog.array.findIndex(themes, function(theme) {
          return theme['name'] == this.appTheme_.getCurrentTheme();
        }, this);
        if (themeIndex < 0) {
          this.appThemes_.isThemePrivate(this.appTheme_.getCurrentTheme())
              .then(goog.bind(
              /**
               * @param {angular.$http.Response} resp Ajax response.
               */
              function(resp) {
                if (resp.data['is_private'] === true) {
                  this.appNotify_(this.translate_.
                      getString(this.privateThemeMsg_, {}),
                      app.NotifyNotificationType.WARNING);
                  this['userOpen'] = true;
                } else {
                  this.switchTheme(this.appTheme_.getDefaultTheme());
                }
              }, this));
        }
      }, this));
};


/**
 * @param {string} themeId The id of the theme.
 * @export
 */
app.ThemeswitcherController.prototype.switchTheme = function(themeId) {
  this.appTheme_.setCurrentTheme(themeId);
};


app.module.controller('AppThemeswitcherController',
    app.ThemeswitcherController);
