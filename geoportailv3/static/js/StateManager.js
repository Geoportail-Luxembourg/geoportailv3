/**
 * @fileoverview This files provides a service for managing the application
 * state. The application state is written to both the URL and the local
 * storage.
 */
goog.module('app.StateManager');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');
const olMath = goog.require('ol.math');
const appNotifyNotificationType = goog.require('app.NotifyNotificationType');


/**
 * @constructor
 * @param {ngeo.statemanager.Location} ngeoLocation ngeo location service.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @ngInject
 */
exports = function(ngeoLocation, appNotify, gettextCatalog) {
  /**
   * @type {angularGettext.Catalog}
   * @private
   */
  this.gettextCatalog_ = gettextCatalog;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * Object representing the application's initial state.
   * @type {!Object.<string ,string>}
   * @private
   */
  this.initialState_ = {};

  /**
   * @type {boolean}
   */
  this.useLocalStorage;
  try {
    if ('localStorage' in window) {
      window.localStorage.setItem('test', '');
      window.localStorage.removeItem('test');
    } else {
      this.useLocalStorage = false;
    }
  } catch (err) {
    console.error(err);
    this.useLocalStorage = false;
  }

  /**
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  /**
   * @type {number}
   * @private
   */
  this.version_ = -1;


  // Populate initialState_ with the application's initial state. The initial
  // state is read from the location URL, or from the local storage if there
  // is no state in the location URL.

  var paramKeys = ngeoLocation.getParamKeys();
  var i, key;

  if (paramKeys.length === 0 ||
      (paramKeys.length === 1 && (paramKeys.indexOf('debug') >= 0 ||
      paramKeys.indexOf('fid') >= 0 || paramKeys.indexOf('lang') >= 0)) ||
      (paramKeys.length === 1 && (paramKeys.indexOf('debug') >= 0 ||
      paramKeys.indexOf('address') >= 0 || paramKeys.indexOf('lang') >= 0)) ||
      (paramKeys.length === 2 &&
      ((paramKeys.indexOf('debug') >= 0 && paramKeys.indexOf('fid') >= 0) ||
      (paramKeys.indexOf('lang') >= 0 && paramKeys.indexOf('fid') >= 0) ||
      (paramKeys.indexOf('debug') >= 0 && paramKeys.indexOf('lang') >= 0))) ||
      (paramKeys.length === 2 &&
      ((paramKeys.indexOf('debug') >= 0 && paramKeys.indexOf('address') >= 0) ||
      (paramKeys.indexOf('lang') >= 0 && paramKeys.indexOf('address') >= 0) ||
      (paramKeys.indexOf('debug') >= 0 && paramKeys.indexOf('lang') >= 0))) ||
      (paramKeys.length === 3 &&
      paramKeys.indexOf('debug') >= 0 && paramKeys.indexOf('fid') >= 0 &&
      paramKeys.indexOf('lang') >= 0) ||
      (paramKeys.length === 3 &&
      paramKeys.indexOf('debug') >= 0 && paramKeys.indexOf('address') >= 0 &&
      paramKeys.indexOf('lang') >= 0
      )) {
    if (this.useLocalStorage !== false) {
      for (const key in window.localStorage) {
        const value = window.localStorage[key];
        if (paramKeys.indexOf('lang') >= 0 && key === 'lang') {
          this.initialState_[key] = ngeoLocation.getParam(key);
        } else {
          console.assert(key !== null, 'The key should not be null');
          this.initialState_[key] = value;
        }
      }
    }
    this.version_ = 3;
  } else {
    var keys = ngeoLocation.getParamKeys();
    for (i = 0; i < keys.length; ++i) {
      key = keys[i];
      this.initialState_[key] = ngeoLocation.getParam(key);
    }
    this.version_ = this.initialState_.hasOwnProperty('version') ?
        olMath.clamp(+this.initialState_['version'], 2, 3) : 2;
  }
  var mapId = this.ngeoLocation_.getParam('map_id');
  if (mapId === undefined &&
      !((this.initialState_.hasOwnProperty('bgLayer') &&
      this.initialState_['bgLayer'].length > 0 &&
      this.initialState_['bgLayer'] != 'blank') ||
      (this.initialState_.hasOwnProperty('layers') &&
      this.initialState_['layers'].length > 0) ||
      (this.initialState_.hasOwnProperty('fid') &&
      this.initialState_['fid'].length > 0))) {
    this.initialState_['bgLayer'] = 'basemap_2015_global';
    var msg = this.gettextCatalog_.getString(
        'Aucune couche n\'étant définie pour cette carte,' +
        ' une couche de fond a automatiquement été ajoutée.');
    this.notify_(msg, appNotifyNotificationType.INFO);
  }

  console.assert(this.version_ != -1);

  this.ngeoLocation_.updateParams({'version': 3});
};


/**
 * Return the version as set in the initial URL (the URL that user
 * used to load the application in the browser).
 * @return {number} Version.
 */
exports.prototype.getVersion = function() {
  return this.version_;
};


/**
 * Get the state value for `key`.
 * @param {string} key State key.
 * @return {string|undefined} State value.
 */
exports.prototype.getInitialValue = function(key) {
  return this.initialState_[key];
};


/**
 * Get the state value for `key` from local storage.
 * @param {string} key State key.
 * @return {string|null} State value.
 */
exports.prototype.getValueFromLocalStorage = function(key) {
  return window.localStorage[key];
};


/**
 * Update the application state with the values in `object`.
 * @param {!Object.<string, string>} object Object.
 */
exports.prototype.updateState = function(object) {
  this.ngeoLocation_.updateParams(object);
  if (this.useLocalStorage !== false) {
    var key;
    for (key in object) {
      window.localStorage[key] = object[key];
    }
  }
};


/**
 * Update the application storage with the values in `object`.
 * @param {!Object.<string, string>} object Object.
 */
exports.prototype.updateStorage = function(object) {
  if (this.useLocalStorage !== false) {
    var key;
    for (key in object) {
      window.localStorage[key] = object[key];
    }
  }
};


/**
 * Delete a parameter.
 * @param {string} key The key to remove.
 */
exports.prototype.deleteParam = function(key) {
  this.ngeoLocation_.deleteParam(key);
  if (this.useLocalStorage !== false) {
    delete window.localStorage[key];
  }
};

appModule.service('appStateManager', exports);
