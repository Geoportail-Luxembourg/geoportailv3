/**
 * @module app.Theme
 */
/**
 * @fileoverview This service keeps and share the state of the theme.
 */

import appModule from './module.js';

/**
 * @constructor
 * @param {angular.$window} $window Global Scope.
 * @param {ngeo.statemanager.Location} ngeoLocation ngeo Location service.
 * @param {app.Themes} appThemes The themes services.
 * @ngInject
 */
const exports = function($window, ngeoLocation, appThemes) {

  /**
   * @const
   * @private
   * @type {Object}
   */
  this.piwikSiteIdLookup_ = {
    'eau': 6,
    'tourisme': 7,
    'emwelt': 8,
    'agriculture': 9,
    'prof': 10,
    'go': 11,
    'm': 12,
    'at': 16,
    'map': 18,
    'main': 18,
    'pag': 19,
    'cadastre_hertzien': 25
  };

  /**
   * @type {angular.$window}
   * @private
   */
  this.window_ = $window;

  /**
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

  /**
   * @type {string}
   * @private
   */
  this.currentTheme_ = exports.DEFAULT_THEME_;

  /**
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;
};


/**
 * @param {string} themeId The id of the theme.
 */
exports.prototype.setCurrentTheme = function(themeId) {
  this.currentTheme_ = themeId;

  var piwikSiteId = this.piwikSiteIdLookup_[this.currentTheme_];
  if (piwikSiteId === undefined || piwikSiteId === null) {
    piwikSiteId = this.piwikSiteIdLookup_[exports.DEFAULT_THEME_];
  }
  var piwik = /** @type {Piwik} */ (this.window_['_paq']);
  piwik.push(['setSiteId', piwikSiteId]);
  piwik.push(['setDocumentTitle', themeId]);
  piwik.push(['trackPageView']);

  this.setLocationPath_(this.currentTheme_);
};


/**
 * @return {string} themeId The id of the theme.
 */
exports.prototype.getCurrentTheme = function() {
  return this.currentTheme_;
};

/**
 * Encode the theme name.
 * @param {string} theme The theme to encode.
 * @return {string} The theme.
 * @export
 */
exports.prototype.encodeThemeName = function(theme) {
  if (theme !== undefined) {
    return theme.replace(/\s+/g, '_');
  }
  return theme;
};

/**
 * @return {string} themeId The id of the theme.
 */
exports.prototype.getDefaultTheme = function() {
  return exports.DEFAULT_THEME_;
};


/**
 * @param {string} themeId The theme id to set in the path of the URL.
 * @private
 */
exports.prototype.setLocationPath_ = function(themeId) {
  var pathElements = this.ngeoLocation_.getPath().split('/');
  console.assert(pathElements.length > 1);
  if (pathElements[pathElements.length - 1] === '') {
    // case where the path is just "/"
    pathElements.splice(pathElements.length - 1);
  }
  if (this.themeInUrl(pathElements)) {
    pathElements[pathElements.length - 1] = themeId;
  } else {
    pathElements.push('theme', themeId);
  }
  this.ngeoLocation_.setPath(pathElements.join('/'));
};


/**
 * Return true if there is a theme specified in the URL path.
 * @param {Array.<string>} pathElements Array of path elements.
 * @return {boolean} theme in path.
 */
exports.prototype.themeInUrl = function(pathElements) {
  var indexOfTheme = pathElements.indexOf('theme');
  return indexOfTheme >= 0 &&
      pathElements.indexOf('theme') == pathElements.length - 2;
};


/**
 * @const
 * @private
 */
exports.DEFAULT_THEME_ = 'main';

appModule.service('appTheme', exports);


export default exports;
