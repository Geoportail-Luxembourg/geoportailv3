/**
 * @fileoverview This files provides a service for managing application
 * states. States are written to both the URL (through the ngeoLocation
 * service) and the local storage.
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
   * @type {ngeo.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  var version = ngeoLocation.getParam('version');

  /**
   * @type {number}
   * @private
   */
  this.version_ = goog.isDef(version) ? goog.math.clamp(+version, 2, 3) : 2;

  this.ngeoLocation_.updateParams({'version': 3});

  /**
   * @type {goog.storage.mechanism.HTML5LocalStorage}
   * @private
   */
  this.localStorage_ = new goog.storage.mechanism.HTML5LocalStorage();

  goog.asserts.assert(this.localStorage_.isAvailable());
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
 * @param {string} key Param key.
 * @return {string|undefined} Param value.
 */
app.StateManager.prototype.getParam = function(key) {
  var value = this.ngeoLocation_.getParam(key);
  if (!goog.isDef(value)) {
    value = this.localStorage_.get(key);
    if (goog.isNull(value)) {
      value = undefined;
    }
  }
  return value;
};


/**
 * @param {Object.<string, string>} params Params to update.
 */
app.StateManager.prototype.updateParams = function(params) {
  this.ngeoLocation_.updateParams(params);
  var param;
  for (param in params) {
    this.localStorage_.set(param, params[param]);
  }
};


app.module.service('appStateManager', app.StateManager);
