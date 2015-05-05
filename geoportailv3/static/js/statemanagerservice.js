/**
 * @fileoverview This files provides a service for managing the application
 * state. The application state is written to both the URL and the local
 * storage.
 */
goog.provide('app.StateManager');

goog.require('app');
goog.require('goog.asserts');
goog.require('goog.math');
goog.require('goog.storage.mechanism.HTML5LocalStorage');
goog.require('ngeo.Location');



/**
 * @constructor
 * @param {ngeo.Location} ngeoLocation ngeo location service.
 * @ngInject
 */
app.StateManager = function(ngeoLocation) {

  /**
   * Object representing the application's initial state.
   * @type {Object.<string ,string>}
   * @private
   */
  this.initialState_ = {};

  /**
   * @type {ngeo.Location}
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
      (paramKeys.length === 1 && paramKeys[0] == 'debug')) {
    if (this.localStorage_.isAvailable()) {
      var count = this.localStorage_.getCount();
      for (i = 0; i < count; ++i) {
        key = this.localStorage_.key(i);
        goog.asserts.assert(!goog.isNull(key));
        this.initialState_[key] = this.localStorage_.get(key);
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
 * Update the application state with the values in `object`.
 * @param {Object.<string, string>} object Object.
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


app.module.service('appStateManager', app.StateManager);
