/**
 * @fileoverview This file provides the "themeswitcher" directive.
 * That directive is used to create the theme switcher in the page.
 *
 */
goog.module('app.themeswitcher.ThemeswitcherController');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');
const appNotifyNotificationType = goog.require('app.NotifyNotificationType');
const appEventsThemesEventType = goog.require('app.events.ThemesEventType');
const olEvents = goog.require('ol.events');


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
exports = function(gettextCatalog, ngeoLocation,
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

  olEvents.listen(appThemes, appEventsThemesEventType.LOAD,
      /**
       * @param {ol.events.Event} evt Event.
       */
      (function(evt) {
        this.setThemes_();
      }), this);

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
exports.prototype.getCurrentTheme = function() {
  return this.appTheme_.getCurrentTheme();
};


/**
 * Encode the theme name.
 * @param {string} theme The theme to encode.
 * @return {string} The theme.
 * @export
 */
exports.prototype.encodeThemeName = function(theme) {
  return this.appTheme_.encodeThemeName(theme);
};


/**
 * @private
 */
exports.prototype.setThemes_ = function() {
  this.appThemes_.getThemesObject().then(
      /**
       * Keep only the themes dedicated to the theme switcher
       * @param {Array.<Object>} themes Array of theme objects.
       */
      (function(themes) {
        this['themes'] = themes.filter(function(object) {
          return 'true' == object['metadata']['display_in_switcher'];
        });
        // Check whether the current theme is valid or is protected;
        // and if it's not, use the default theme.
        // A theme is valid if it is present in the list of themes.
        // A theme is protected if the related WS returns true
        var curTheme = themes.find(function(theme) {
          return theme['name'] == this.appTheme_.getCurrentTheme();
        }, this);
        if (curTheme !== undefined) {
          var themeIndex = themes.indexOf(curTheme);
          if (themeIndex < 0) {
            this.appThemes_.isThemePrivate(this.appTheme_.getCurrentTheme())
                .then(
                /**
                 * @param {angular.$http.Response} resp Ajax response.
                 */
                (function(resp) {
                  if (resp.data['is_private'] === true) {
                    this.appNotify_(this.translate_.
                        getString(this.privateThemeMsg_, {}),
                        appNotifyNotificationType.WARNING);
                    this['userOpen'] = true;
                  } else {
                    this.switchTheme(this.appTheme_.getDefaultTheme());
                  }
                }).bind(this));
          }
        }
      }).bind(this));
};


/**
 * @param {string} themeId The id of the theme.
 * @export
 */
exports.prototype.switchTheme = function(themeId) {
  this.appTheme_.setCurrentTheme(themeId);
};


appModule.controller('AppThemeswitcherController',
    exports);
