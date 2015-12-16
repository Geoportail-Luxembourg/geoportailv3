/**
 * @fileoverview This service keeps and share the state of the theme.
 */
goog.provide('app.Theme');

goog.require('ngeo.Location');



/**
 * @constructor
 * @param {ngeo.Location} ngeoLocation ngeo Location service.
 * @ngInject
 */
app.Theme = function(ngeoLocation) {
  /**
   * @type {string}
   * @private
   */
  this.currentTheme_ = app.Theme.DEFAULT_THEME_;

  /**
   * @type {ngeo.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;
};


/**
 * @param {string} themeId The id of the theme.
 */
app.Theme.prototype.setCurrentTheme = function(themeId) {
  this.currentTheme_ = themeId;
  this.setLocationPath_(this.currentTheme_);
};


/**
 * @return {string} themeId The id of the theme.
 */
app.Theme.prototype.getCurrentTheme = function() {
  return this.currentTheme_;
};


/**
 * @return {string} themeId The id of the theme.
 */
app.Theme.prototype.getDefaultTheme = function() {
  return app.Theme.DEFAULT_THEME_;
};


/**
 * @param {string} themeId The theme id to set in the path of the URL.
 * @private
 */
app.Theme.prototype.setLocationPath_ = function(themeId) {
  var pathElements = this.ngeoLocation_.getPath().split('/');
  goog.asserts.assert(pathElements.length > 1);
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
app.Theme.prototype.themeInUrl = function(pathElements) {
  var indexOfTheme = pathElements.indexOf('theme');
  return indexOfTheme >= 0 &&
      pathElements.indexOf('theme') == pathElements.length - 2;
};


/**
 * @const
 * @private
 */
app.Theme.DEFAULT_THEME_ = 'main';

app.module.service('appTheme', app.Theme);
