// @ts-check
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
import olEventsEventTarget from 'ol/events/Target.js';
import appEventsThemesEventType from './events/ThemesEventType.js';
import olSourceVector from 'ol/source/Vector.js';
import {inherits} from './utils.js';
import MapBoxLayer from '@geoblocks/mapboxlayer/src/MapBoxLayer.js';


function hasLocalStorage() {
  return 'localStorage' in window && localStorage;
}

function onFirstTargetChange(map) {
  return new Promise(function(resolve) {
    if (map.getTarget()) {
      resolve(map.getTarget());
    }
    map.once('change:target', () => {
      resolve(map.getTarget());
    });
  });
}

/**
 * @param {import('ol/layer/Layer.js').default[]} bgLayers
 */
function replaceWithMVTLayer(bgLayers, target, styleConfigs) {
  styleConfigs.forEach(styleConfig => {
    // add MapBox layer
    const label = styleConfig.label;

    bgLayers.forEach((l, i) => {
      if (l.get('label') === label) {
        const options = Object.assign({
          container: target,
        }, styleConfig)
        const mvtLayer = new MapBoxLayer(options);
        mvtLayer.set('metadata', l.get('metadata'));
        if ('attribution' in l.get('metadata')) {
          const source = new olSourceVector({
              attributions: l.get('metadata')['attribution']
          });
          mvtLayer.setSource(source);
        }
        bgLayers[i] = mvtLayer;
      }
    });
  });
}

/**
 * @constructor
 * @param {angular.$window} $window Window.
 * @param {angular.$http} $http Angular http service.
 * @param {string} gmfTreeUrl URL to "themes" web service.
 * @param {string} isThemePrivateUrl URL to check if theme is public.
 * @param {app.GetWmtsLayer} appGetWmtsLayer Get WMTS layer function.
 * @param {app.backgroundlayer.BlankLayer} appBlankLayer Blank Layer service.
 * @param {app.GetDevice} appGetDevice The device service.
 * @param {app.Mvtstyling} appMvtStylingService The mvt styling service.
 * @ngInject
 */
const exports = function($window, $http, gmfTreeUrl, isThemePrivateUrl,
    appGetWmtsLayer, appBlankLayer, appGetDevice, appMvtStylingService) {
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

  /**
   * @type {app.Mvtstyling}
   * @private
   */
  this.appMvtStylingService_ = appMvtStylingService;

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
 * @return {Promise<any[]>} Promise.
 */
exports.prototype.getBgLayers = function(map) {
  console.assert(this.promise_);
  console.assert(map);
  if (!this.getBgLayersPromise_) {
    this.getBgLayersPromise_ = this.promise_.then(
      /**
       * @param {app.ThemesResponse} data The "themes" web service response.
       * @return {Array.<Object>} Array of background layer objects.
       */
      data => {
        var bgLayers = data['background_layers'].map(item => {
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
        });

        // add the blank layer
        bgLayers.push(this.blankLayer_.getLayer());

        // add MVT layer
        const bothPromises = Promise.all([
          onFirstTargetChange(map),
          this.appMvtStylingService_.getBgStyle()
        ]);
        return bothPromises.then(([target, styleConfigs]) => {
          replaceWithMVTLayer(bgLayers, target, styleConfigs);
          return bgLayers;
        });
      });
  }
  return this.getBgLayersPromise_;
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
  var url = new URL(this.treeUrl_);
  url.searchParams.set('background', 'background');
  this.promise_ = this.$http_.get(url.toString(), {
    params: (roleId !== undefined) ? {'role': roleId} : {},
    cache: false
  }).then(resp => {
    const root = /** @type {app.ThemesResponse} */ (resp.data);
    const themes = root.themes;
    const flatCatalogue = [];
    for (const theme of themes) {
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
