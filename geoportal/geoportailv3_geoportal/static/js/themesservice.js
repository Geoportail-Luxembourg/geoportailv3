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
goog.require('goog.object');
goog.require('goog.array');
goog.require('ol.events.EventTarget');


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
 * @extends {ol.events.EventTarget}
 * @param {angular.$window} $window Window.
 * @param {angular.$http} $http Angular http service.
 * @param {string} treeUrl URL to "themes" web service.
 * @param {string} isThemePrivateUrl URL to check if theme is public.
 * @param {app.GetWmtsLayer} appGetWmtsLayer Get WMTS layer function.
 * @param {app.BlankLayer} appBlankLayer Blank Layer service.
 * @param {app.GetDevice} appGetDevice The device service.
 * @ngInject
 */
app.Themes = function($window, $http, treeUrl, isThemePrivateUrl,
    appGetWmtsLayer, appBlankLayer, appGetDevice) {

  goog.base(this);

  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

  /**
   * @type {boolean}
   * @private
   */
  this.isHiDpi_ = appGetDevice.isHiDpi();

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
goog.inherits(app.Themes, ol.events.EventTarget);


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
          var hasRetina = item['metadata']['hasRetina'] === 'true' && this.isHiDpi_;
          goog.asserts.assert('name' in item);
          goog.asserts.assert('imageType' in item);
          var layer = this.getWmtsLayer_(
            item['name'], item['imageType'], hasRetina
          );
          layer.set('metadata', item['metadata']);

          if (goog.object.containsKey(item['metadata'], 'attribution')) {
            var source = layer.getSource();
            source.setAttributions(
              item['metadata']['attribution']
            );
          }
          return layer;
        }, this));

        // add the blank layer
        bgLayers.push(this.blankLayer_.getLayer());
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
 * @return {?angular.$q.Promise} Promise.
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
  return this.promise_;
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


/**
 * @param {Array} element The element.
 * @param {string} theme Theme name.
 * @return {Array} array The children.
 * @private
 */
app.Themes.prototype.getAllChildren_ = function(element, theme) {
  var array = [];
  for (var i = 0; i < element.length; i++) {
    if (element[i].hasOwnProperty('children')) {
      goog.array.extend(array, this.getAllChildren_(
          element[i].children, theme)
      );
    } else {
      // element[i].id = element[i].id;
      element[i].theme = theme;
      array.push(element[i]);
    }
  }
  return array;
};


/**
 * get the flat catlog
 * @return {angular.$q.Promise} Promise.
 */
app.Themes.prototype.getFlatCatalog = function() {
  return this.getThemesObject().then(
      goog.bind(function(themes) {
        var flatCatalogue = [];
        for (var i = 0; i < themes.length; i++) {
          var theme = themes[i];
          goog.array.extend(flatCatalogue,
              this.getAllChildren_(theme.children, theme.name)
          );
        }
        return flatCatalogue;
      }, this));
};

app.module.service('appThemes', app.Themes);
