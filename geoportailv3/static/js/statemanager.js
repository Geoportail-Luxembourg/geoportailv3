/**
 * @fileoverview This files provides a service for managing the application
 * state. The application state is written to both the URL and the local
 * storage.
 */
goog.provide('app.StateManager');

goog.require('app.module');
goog.require('goog.asserts');
goog.require('goog.math');
goog.require('goog.storage.mechanism.HTML5LocalStorage');
goog.require('app.NotifyNotificationType');


/**
 * @constructor
 * @param {ngeo.statemanager.Location} ngeoLocation ngeo location service.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @ngInject
 */
app.StateManager = function(ngeoLocation, appNotify, gettextCatalog) {
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
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  /**
   * @type {goog.storage.mechanism.HTML5LocalStorage}
   * @private
   */
  this.localStorage_ = new goog.storage.mechanism.HTML5LocalStorage();

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
    if (this.localStorage_.isAvailable()) {
      var count = this.localStorage_.getCount();
      for (i = 0; i < count; ++i) {
        key = this.localStorage_.key(i);
        if (paramKeys.indexOf('lang') >= 0 && key === 'lang') {
          this.initialState_[key] = ngeoLocation.getParam(key);
        } else {
          goog.asserts.assert(!goog.isNull(key));
          this.initialState_[key] = this.localStorage_.get(key);
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
        goog.math.clamp(+this.initialState_['version'], 2, 3) : 2;
  }
  var mapId = this.ngeoLocation_.getParam('map_id');
  if (!goog.isDef(mapId) &&
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
    this.notify_(msg, app.NotifyNotificationType.INFO);
  }

  goog.asserts.assert(this.version_ != -1);

  this.ngeoLocation_.updateParams({'version': 3});
};


/**
 * Return the version as set in the initial URL (the URL that user
 * used to load the application in the browser).
 * @return {number} Version.
 */
app.StateManager.prototype.getVersion = function() {
  return this.version_;
};


/**
 * Get the state value for `key`.
 * @param {string} key State key.
 * @return {string|undefined} State value.
 */
app.StateManager.prototype.getInitialValue = function(key) {
  return this.initialState_[key];
};


/**
 * Get the state value for `key` from local storage.
 * @param {string} key State key.
 * @return {string|null} State value.
 */
app.StateManager.prototype.getValueFromLocalStorage = function(key) {
  return this.localStorage_.get(key);
};


/**
 * Update the application state with the values in `object`.
 * @param {!Object.<string, string>} object Object.
 */
app.StateManager.prototype.updateState = function(object) {
  this.ngeoLocation_.updateParams(object);
  if (this.localStorage_.isAvailable()) {
    var key;
    for (key in object) {
      this.localStorage_.set(key, object[key]);
    }
  }
};


/**
 * Update the application storage with the values in `object`.
 * @param {!Object.<string, string>} object Object.
 */
app.StateManager.prototype.updateStorage = function(object) {
  if (this.localStorage_.isAvailable()) {
    var key;
    for (key in object) {
      this.localStorage_.set(key, object[key]);
    }
  }
};


/**
 * Delete a parameter.
 * @param {string} key The key to remove.
 */
app.StateManager.prototype.deleteParam = function(key) {
  this.ngeoLocation_.deleteParam(key);
  if (this.localStorage_.isAvailable()) {
    this.localStorage_.remove(key);
  }
};

app.module.service('appStateManager', app.StateManager);
