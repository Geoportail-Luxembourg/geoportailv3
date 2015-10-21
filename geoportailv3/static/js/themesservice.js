/**
 * @fileoverview This file defines the Themes service. This service interacts
 * with c2cgeoportal's "themes" web service and exposes functions that return
 * objects in the tree returned by the "themes" web service.
 */
goog.provide('app.Themes');
goog.provide('app.ThemesEventType');

goog.require('app');
goog.require('app.BlankLayer');
goog.require('app.GetWmtsLayer');
goog.require('goog.asserts');
goog.require('goog.events.EventTarget');


/**
 * @typedef {{themes: Array.<Object>, background_layers: Array.<Object>}}
 */
app.ThemesResponse;


/**
 * @enum {string}
 */
app.ThemesEventType = {
  LOAD: 'load'
};



/**
 * @constructor
 * @extends {goog.events.EventTarget}
 * @param {angular.$http} $http Angular http service.
 * @param {string} treeUrl URL to "themes" web service.
 * @param {string} isThemePrivateUrl URL to check if theme is public.
 * @param {app.GetWmtsLayer} appGetWmtsLayer Get WMTS layer function.
 * @param {app.BlankLayer} appBlankLayer Blank Layer service.
 * @ngInject
 */
app.Themes = function($http, treeUrl, isThemePrivateUrl,
    appGetWmtsLayer, appBlankLayer) {

  goog.base(this);

  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

  /**
   * @type {app.GetWmtsLayer}
   * @private
   */
  this.getWmtsLayer_ = appGetWmtsLayer;

  /**
   * @type {app.BlankLayer}
   * @private
   */
  this.blankLayer_ = appBlankLayer;

  /**
   * @type {string}
   * @private
   */
  this.treeUrl_ = treeUrl;

  /**
   * @type {string}
   * @private
   */
  this.isThemePrivateUrl_ = isThemePrivateUrl;

  /**
   * @type {?angular.$q.Promise}
   * @private
   */
  this.promise_ = null;
};
goog.inherits(app.Themes, goog.events.EventTarget);


/**
 * Find an object by its name. Return null if not found.
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
 * Find a theme object by its name. Return null if not found.
 * @param {Array.<Object>} themes Array of "theme" objects.
 * @param {string} themeName The theme name.
 * @return {Object} The theme object.
 * @private
 */
app.Themes.findTheme_ = function(themes, themeName) {
  var theme = app.Themes.findObjectByName_(themes, themeName);
  return theme;
};


/**
 * Get background layers.
 * @return {angular.$q.Promise} Promise.
 */
app.Themes.prototype.getBgLayers = function() {
  goog.asserts.assert(!goog.isNull(this.promise_));
  return this.promise_.then(goog.bind(
      /**
       * @param {app.ThemesResponse} data The "themes" web service response.
       * @return {Array.<Object>} Array of background layer objects.
       */
      function(data) {
        var bgLayers = data['background_layers'].map(goog.bind(function(item) {
          goog.asserts.assert('name' in item);
          goog.asserts.assert('imageType' in item);
          var layer = this.getWmtsLayer_(item['name'], item['imageType']);
          layer.set('metadata', item['metadata']);
          return layer;
        }, this));

        // add the blank layer
        bgLayers.push(this.blankLayer_);
        return bgLayers;
      }, this));
};


/**
 * Get a theme object by its name.
 * @param {string} themeName Theme name.
 * @return {angular.$q.Promise} Promise.
 */
app.Themes.prototype.getThemeObject = function(themeName) {
  goog.asserts.assert(!goog.isNull(this.promise_));
  return this.promise_.then(
      /**
       * @param {app.ThemesResponse} data The "themes" web service response.
       * @return {Object} The theme object for themeName, or null if not found.
       */
      function(data) {
        var themes = data['themes'];
        return app.Themes.findTheme_(themes, themeName);
      });
};


/**
 * Get an array of theme objects.
 * @return {angular.$q.Promise} Promise.
 */
app.Themes.prototype.getThemesObject = function() {
  goog.asserts.assert(!goog.isNull(this.promise_));
  return this.promise_.then(
      /**
       * @param {app.ThemesResponse} data The "themes" web service response.
       * @return {Array.<Object>} The themes object.
       */
      function(data) {
        var themes = data['themes'];
        return themes;
      });
};


/**
 * @param {?number} roleId The role id to send in the request.
 * Load themes from the "themes" service.
 */
app.Themes.prototype.loadThemes = function(roleId) {
  this.promise_ = this.$http_.get(this.treeUrl_, {
    params: goog.isDef(roleId) ? {'role': roleId} : {},
    cache: false
  }).then(goog.bind(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {Object} The "themes" web service response.
       */
      function(resp) {
        this.dispatchEvent(app.ThemesEventType.LOAD);
        return /** @type {app.ThemesResponse} */ (resp.data);
      }, this));
};


/**
 * @param {string} themeId The theme id to send in the request.
 * checks if the theme is protected or not.
 * @return {angular.$q.Promise} Promise.
 */
app.Themes.prototype.isThemePrivate = function(themeId) {
  return this.$http_.get(this.isThemePrivateUrl_, {
    params: {'theme': themeId},
    cache: false
  });
};

app.module.service('appThemes', app.Themes);
