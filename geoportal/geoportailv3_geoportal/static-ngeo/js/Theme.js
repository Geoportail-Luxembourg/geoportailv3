/**
 * @module app.Theme
 */
/**
 * @fileoverview This service keeps and share the state of the theme.
 */
import { urlStorage } from "luxembourg-geoportail/bundle/lux.dist.js";
import appModule from './module.js';
import {transformExtent} from 'ol/proj.js';
import olView from 'ol/View.js';

import { 
  useMap
} from "luxembourg-geoportail/bundle/lux.dist.js";

/**
 * @constructor
 * @param {angular.$window} $window Global Scope.
 * @param {app.Themes} appThemes The themes services.
 * @ngInject
 */
const exports = function(
  $window,
  appThemes,
  appStateManager,
  appScalesService,
  maxExtent
  ) {

  /**
   * @type {app.StateManager}
   * @private
   */
  this.appStateManager_ = appStateManager;

  /**
   * @type {app.ScalesService}
   * @private
   */
  this.scales_ = appScalesService;

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
    'cadastre_hertzien': 25,
    'atlas_demographique': 29,
    'urban_farming': 30,
    'logement': 32,
    'energie': 40,
    'embedded': 44,
    'geosciences': 59,
    'np_our': 67
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
};


/**
 * @param {string} themeId The id of the theme.
 */
exports.prototype.setCurrentTheme = function(themeId) {
  this.currentTheme_ = themeId;

  var piwikSiteId = this.piwikSiteIdLookup_[this.currentTheme_];
  if (!!(new URL(window.location).searchParams.get('embedded'))) {
    piwikSiteId = this.piwikSiteIdLookup_['embedded'];
  }
  var isApp =
    location.search.includes('localforage=android') ||
    location.search.includes('localforage=ios') ||
    location.search.includes('applogin=yes');
  if (isApp) {
    piwikSiteId = this.piwikSiteIdLookup_['m'];
  }
  if (piwikSiteId === undefined || piwikSiteId === null) {
    piwikSiteId = this.piwikSiteIdLookup_[exports.DEFAULT_THEME_];
  }
  var piwik = /** @type {Piwik} */ (this.window_['_paq']);
  if (piwik != undefined) {
    piwik.push(['setSiteId', piwikSiteId]);
    piwik.push(['setDocumentTitle', themeId]);
    piwik.push(['trackPageView']);
  }
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
 * COPY FROM Catalog, as Catalog controller is no longer used (switch to v4 component)
 * @param {Object} tree Tree object for the theme.
 * Set the maximum scale regarding the loaded theme.
 */
exports.prototype.setThemeZooms = function(tree) {
  var map = useMap().getOlMap();
  
  var maxZoom = 19;
  if (tree !== null) {
    console.assert('metadata' in tree);
    if (tree['metadata']['resolutions']) {
      var resolutions = tree['metadata']['resolutions'];
      maxZoom = resolutions.length + 7;
    }

    var currentView = map.getView();

    let rotation = 0;
    
    if (urlStorage.getItem('rotation') !== undefined) {
      rotation = Number(urlStorage.getItem('rotation'));
    }

    currentView.setMaxZoom(maxZoom)
    currentView.setMinZoom(8)
    currentView.setConstrainResolution(true)
    currentView.setRotation(rotation)
  }

  this.scales_.setMaxZoomLevel(maxZoom);
  var viewZoom = map.getView().getZoom();
  this.appStateManager_.updateState({
    'zoom': viewZoom
  });
};

/**
 * @const
 * @private
 */
exports.DEFAULT_THEME_ = 'main';

appModule.service('appTheme', exports);


export default exports;
