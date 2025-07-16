/**
 * @module app.StateManager
 */
/**
 * @fileoverview This files provides a service for managing the application
 * state. The application state is written to both the URL and the local
 * storage.
 */

import appModule from './module.js';
import {clamp} from 'ol/math.js';
import { urlStorage } from "luxembourg-geoportail/bundle/lux.dist.js";

/**
 * @constructor
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @ngInject
 */
const exports = function(appNotify, gettextCatalog) {

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
  this.useLocalStorage = true;
  try {
    if ('localStorage' in window && window.localStorage) {
      window.localStorage.setItem('test', '');
      window.localStorage.removeItem('test');
    } else {
      this.useLocalStorage = false;
    }
  } catch (err) {
    console.error('localStorage is not available');
    this.useLocalStorage = false;
  }

  /**
   * @type {number}
   * @private
   */
  this.version_ = -1;


  // Populate initialState_ with the application's initial state. The initial
  // state is read from the location URL, or from the local storage if there
  // is no state in the location URL.

  exports.prototype.getParamKeys = function() {
    const keys = [];
    for (const key in this.queryData_) {
      keys.push(key);
    }
    return keys;
  };
  
  var paramKeys = Object.keys(urlStorage.getSnappedParamsAsObj());

  /**
   * @type {string}
   * @private
   */
  this.initialparamKeys_ = paramKeys;

  var i, key;

  if (paramKeys.length === 0 ||
      (paramKeys.length === 1 && (paramKeys.indexOf('ipv6') >= 0 ||
      paramKeys.indexOf('applogin') >= 0 || paramKeys.indexOf('localforage') >= 0)) ||
      (paramKeys.length === 3 && (paramKeys.indexOf('ipv6') >= 0 &&
      paramKeys.indexOf('applogin') >= 0 && paramKeys.indexOf('localforage') >= 0)) ||
      (paramKeys.length === 2 && (paramKeys.indexOf('applogin') >= 0 &&
      paramKeys.indexOf('localforage') >= 0)) ||
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
    if (this.useLocalStorage) {
      for (const key in window.localStorage) {
        const value = window.localStorage[key];
        if (paramKeys.indexOf('lang') >= 0 && key === 'lang') {
          this.initialState_[key] = urlStorage.getItem(key);
        } else {
          console.assert(key !== null, 'The key should not be null');
          this.initialState_[key] = value;
        }
      }
    }
    this.version_ = 3;
  } else {
    var keys = Object.keys(urlStorage.getSnappedParamsAsObj());
    for (i = 0; i < keys.length; ++i) {
      key = keys[i];
      this.initialState_[key] = urlStorage.getItem(key);
    }
    this.version_ = this.initialState_.hasOwnProperty('version') ?
        clamp(+this.initialState_['version'], 2, 3) : 2;
  }
  console.assert(this.version_ != -1);
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
 * Get the initial parameters.
 * @return {Array.<String>} The paramter keys.
 */
exports.prototype.getInitialParamKeys = function() {
  return this.initialparamKeys_;
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
  if (this.useLocalStorage) {
    return window.localStorage[key];
  }
};


/**
 * Update the application state with the values in `object`.
 * @param {!Object.<string, string>} object Object.
 */
exports.prototype.updateState = function(object) {
  for (let key in object) {
    if (object[key] !== null) {
      urlStorage.setItem(key, object[key]);
    }
  }
  if (this.useLocalStorage) {
    for (let key in object) {
      window.localStorage[key] = object[key];
    }
  }
};


/**
 * Update the application storage with the values in `object`.
 * @param {!Object.<string, string>} object Object.
 */
exports.prototype.updateStorage = function(object) {
  if (this.useLocalStorage) {
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
  urlStorage.removeItem(key);
  if (this.useLocalStorage) {
    delete window.localStorage[key];
  }
};

appModule.service('appStateManager', exports);


export default exports;
