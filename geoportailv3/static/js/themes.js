/**
 * @fileoverview This file defines the Themes service. This service interacts
 * with c2cgeoportal's "themes" web service and exposes functions that return
 * objects in the tree returned by the "themes" web service.
 */
goog.provide('app.Themes');

goog.require('app.module');
goog.require('ol');
goog.require('ol.array');
goog.require('ol.events.EventTarget');
goog.require('app.events.ThemesEventType');


/**
 * @constructor
 * @extends {ol.events.EventTarget}
 * @param {angular.$window} $window Window.
 * @param {angular.$http} $http Angular http service.
 * @param {string} treeUrl URL to "themes" web service.
 * @param {string} isThemePrivateUrl URL to check if theme is public.
 * @param {app.GetWmtsLayer} appGetWmtsLayer Get WMTS layer function.
 * @param {app.backgroundlayer.BlankLayer} appBlankLayer Blank Layer service.
 * @param {app.GetDevice} appGetDevice The device service.
 * @ngInject
 */
app.Themes = function($window, $http, treeUrl, isThemePrivateUrl,
    appGetWmtsLayer, appBlankLayer, appGetDevice) {
  ol.events.EventTarget.call(this);

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
   * @type {app.backgroundlayer.BlankLayer}
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
ol.inherits(app.Themes, ol.events.EventTarget);


/**
 * Find an object by its name. Return null if not found.
 * @param {Array.<Object>} objects Array of objects.
 * @param {string} objectName The object name.
 * @return {Object} The object.
 * @private
 */
app.Themes.findObjectByName_ = function(objects, objectName) {
  var obj = objects.find(function(object) {
    return object['name'] === objectName;
  });
  if (obj === undefined) {
    return null;
  }
  return obj;
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
  console.assert(this.promise_ !== null);
  return this.promise_.then(
      /**
       * @param {app.ThemesResponse} data The "themes" web service response.
       * @return {Array.<Object>} Array of background layer objects.
       */
      (function(data) {
        var bgLayers = data['background_layers'].map(function(item) {
          var hasRetina = item['metadata']['hasRetina'] === 'true' && this.isHiDpi_;
          console.assert('name' in item);
          console.assert('imageType' in item);
          var layer = this.getWmtsLayer_(
            item['name'], item['imageType'], hasRetina
          );
          layer.set('metadata', item['metadata']);
          if ('attribution' in item['metadata']) {
            var source = layer.getSource();
            source.setAttributions(
              item['metadata']['attribution']
            );
          }
          return layer;
        }.bind(this));

        // add the blank layer
        bgLayers.push(this.blankLayer_.getLayer());
        return bgLayers;
      }).bind(this));
};


/**
 * Get a theme object by its name.
 * @param {string} themeName Theme name.
 * @return {angular.$q.Promise} Promise.
 */
app.Themes.prototype.getThemeObject = function(themeName) {
  console.assert(this.promise_ !== null);
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
  console.assert(this.promise_ !== null);
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
    params: (roleId !== undefined) ? {'role': roleId} : {},
    cache: false
  }).then(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {Object} The "themes" web service response.
       */
      (function(resp) {
        this.dispatchEvent(app.events.ThemesEventType.LOAD);
        return /** @type {app.ThemesResponse} */ (resp.data);
      }).bind(this));
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
      ol.array.extend(array, this.getAllChildren_(
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
      function(themes) {
        var flatCatalogue = [];
        for (var i = 0; i < themes.length; i++) {
          var theme = themes[i];
          ol.array.extend(flatCatalogue,
              this.getAllChildren_(theme.children, theme.name)
          );
        }
        return flatCatalogue;
      }.bind(this));
};

app.module.service('appThemes', app.Themes);
