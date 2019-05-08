/**
 * @module app.Themes
 */
/**
 * @fileoverview This file defines the Themes service. This service interacts
 * with c2cgeoportal's "themes" web service and exposes functions that return
 * objects in the tree returned by the "themes" web service.
 */

import appModule from './module.js';

import {extend as arrayExtend} from 'ol/array.js';
import olEventsEventTarget from 'ol/events/EventTarget.js';
import appEventsThemesEventType from './events/ThemesEventType.js';
import {inherits} from 'ol/index.js';


/**
 * @constructor
 * @extends {ol.events.EventTarget}
 * @param {angular.$window} $window Window.
 * @param {angular.$http} $http Angular http service.
 * @param {string} gmfTreeUrl URL to "themes" web service.
 * @param {string} isThemePrivateUrl URL to check if theme is public.
 * @param {app.GetWmtsLayer} appGetWmtsLayer Get WMTS layer function.
 * @param {app.backgroundlayer.BlankLayer} appBlankLayer Blank Layer service.
 * @param {app.GetDevice} appGetDevice The device service.
 * @ngInject
 */
const exports = function($window, $http, gmfTreeUrl, isThemePrivateUrl,
    appGetWmtsLayer, appBlankLayer, appGetDevice) {
  olEventsEventTarget.call(this);

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
  this.treeUrl_ = gmfTreeUrl;

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

  this.flatCatalog = null;
};

inherits(exports, olEventsEventTarget);


/**
 * Find an object by its name. Return null if not found.
 * @param {Array.<Object>} objects Array of objects.
 * @param {string} objectName The object name.
 * @return {Object} The object.
 * @private
 */
exports.findObjectByName_ = function(objects, objectName) {
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
exports.findTheme_ = function(themes, themeName) {
  var theme = exports.findObjectByName_(themes, themeName);
  return theme;
};


/**
 * Get background layers.
 * @return {angular.$q.Promise} Promise.
 */
exports.prototype.getBgLayers = function() {
  console.assert(this.promise_ !== null);
  return this.promise_.then(
      /**
       * @param {app.ThemesResponse} data The "themes" web service response.
       * @return {Array.<Object>} Array of background layer objects.
       */
      (function(data) {
        var bgLayers = data['background_layers'].map(function(item) {
          var hasRetina = !!item['metadata']['hasRetina'] && this.isHiDpi_;
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
exports.prototype.getThemeObject = function(themeName) {
  console.assert(this.promise_ !== null);
  return this.promise_.then(
      /**
       * @param {app.ThemesResponse} data The "themes" web service response.
       * @return {Object} The theme object for themeName, or null if not found.
       */
      function(data) {
        var themes = data['themes'];
        return exports.findTheme_(themes, themeName);
      });
};


/**
 * Get the promise resolving to the themes root object.
 * @return {angular.$q.Promise} Promise.
 */
exports.prototype.getThemesPromise = function() {
  console.assert(this.promise_ !== null);
  return this.promise_;
};


/**
 * @param {?number} roleId The role id to send in the request.
 * Load themes from the "themes" service.
 * @return {?angular.$q.Promise} Promise.
 */
exports.prototype.loadThemes = function(roleId) {
  this.promise_ = this.$http_.get(this.treeUrl_, {
    params: (roleId !== undefined) ? {'role': roleId} : {},
    cache: false
  }).then((resp) => {
    const root = /** @type {app.ThemesResponse} */ (resp.data);
    const themes = root.themes;
    const flatCatalogue = [];
    for (var i = 0; i < themes.length; i++) {
      const theme = themes[i];
      const children = this.getAllChildren_(theme.children, theme.name, root.ogcServers);
      arrayExtend(flatCatalogue, children);
    }

    this.flatCatalog = flatCatalogue;

    this.dispatchEvent(appEventsThemesEventType.LOAD);
    return root;
  });
  return this.promise_;
};


/**
 * @param {string} themeId The theme id to send in the request.
 * checks if the theme is protected or not.
 * @return {angular.$q.Promise} Promise.
 */
exports.prototype.isThemePrivate = function(themeId) {
  return this.$http_.get(this.isThemePrivateUrl_, {
    params: {'theme': themeId},
    cache: false
  });
};


/**
 * @param {Array} element The element.
 * @param {string} theme Theme name.
 * @param {Object} ogcServers All OGC servers definitions.
 * @param {Object} lastOgcServer The last OGC server.
 * @return {Array} array The children.
 * @private
 */
exports.prototype.getAllChildren_ = function(elements, theme, ogcServers, lastOgcServer) {
  var array = [];
  for (var i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element.hasOwnProperty('children')) {
      arrayExtend(array, this.getAllChildren_(
          element.children, theme, ogcServers, element.ogcServer || lastOgcServer)
      );
    } else {
      // Rewrite url to match the behaviour of c2cgeoportal 1.6
      const ogcServer = element.ogcServer || lastOgcServer;
      if (ogcServer) {
        const def = ogcServers[ogcServer];
        element.url = def.credential ? null : def.url;
      }
      element.theme = theme;
      array.push(element);
    }
  }
  return array;
};


/**
 * get the flat catlog
 * @return {angular.$q.Promise} Promise.
 */
exports.prototype.getFlatCatalog = function() {
  return this.promise_.then(() => this.flatCatalog);
};

appModule.service('appThemes', exports);


export default exports;
