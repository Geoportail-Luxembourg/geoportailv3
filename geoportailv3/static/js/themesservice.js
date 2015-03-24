/**
 * @fileoverview This file defines the Themes service. This service interacts
 * with c2cgeoportal's "themes" web service and exposes functions that return
 * objects in the tree returned by the "themes" web service.
 */
goog.provide('app.Themes');

goog.require('app');
goog.require('goog.asserts');


/**
 * @typedef {{themes: Array.<Object>, background_layers: Array.<Object>}}
 */
app.ThemesResponse;



/**
 * @constructor
 * @param {angular.$http} $http Angular http service.
 * @param {string} treeUrl URL to "themes" web service.
 * @ngInject
 */
app.Themes = function($http, treeUrl) {
  /**
   * @type {angular.$q.Promise}
   * @private
   */
  this.promise_ = $http.get(treeUrl).then(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {Object} The "themes" web service response.
       */
      function(resp) {
        return /** @type {app.ThemesResponse} */ (resp.data);
      });
};


/**
 * Find an object by its name.
 * @param {Array.<Object>} objects Array of objects.
 * @param {string} objectName The object name.
 * @return {Object} The object.
 * @private
 */
app.Themes.findObjectByName_ = function(objects, objectName) {
  return goog.array.find(objects, function(object) {
    return object['name'] === objectName;
  });
};


/**
 * Find a theme object by its name.
 * @param {Array.<Object>} themes Array of "theme" objects.
 * @param {string} themeName The theme name.
 * @return {Object} The theme object.
 * @private
 */
app.Themes.findTheme_ = function(themes, themeName) {
  var theme = app.Themes.findObjectByName_(themes, themeName);
  goog.asserts.assert(!goog.isNull(theme));
  return theme;
};


/**
 * Get background layers.
 * @return {angular.$q.Promise} Promise.
 */
app.Themes.prototype.getBgLayers = function() {
  return this.promise_.then(
      /**
       * @param {app.ThemesResponse} data The "themes" web service response.
       * @return {Array.<Object>} Array of background layer objects.
       */
      function(data) {
        return data['background_layers'];
      });
};


/**
 * Get a theme object by its name.
 * @param {string} themeName Theme name.
 * @return {angular.$q.Promise} Promise.
 */
app.Themes.prototype.getThemeObject = function(themeName) {
  return this.promise_.then(
      /**
       * @param {app.ThemesResponse} data The "themes" web service response.
       * @return {Object} The theme object for themeName.
       */
      function(data) {
        var themes = data['themes'];
        return app.Themes.findTheme_(themes, themeName);
      });
};


app.module.service('appThemes', app.Themes);
