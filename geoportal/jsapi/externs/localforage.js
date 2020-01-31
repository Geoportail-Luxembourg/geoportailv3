/**
 * @fileoverview Externs for localForage
 *
 * @see https://github.com/mozilla/localForage
 * @externs
 */

/**
 * @typedef {{
 *   description: (?string|undefined),
 *   driver: (Array<*>|undefined),
 *   name: (?string|undefined),
 *   size: (?number|undefined),
 *   storeName: (?string|undefined),
 *   version: (?*|undefined)
 * }}
 */
var LocalForageConfig;

/**
 * @constructor
 * @param {LocalForageConfig=} options
 */
function Localforage(options) {}

/**
 * @param {LocalForageConfig} options
 */
Localforage.prototype.config = function(options) {};

/**
 * @param {string} key
 * @param {*} value
 * @return {Promise} 
 */
Localforage.prototype.setItem = function(key, value) {};

/**
 * @param {string} key
 * @return {Promise<*>}
 */
Localforage.prototype.getItem = function(key) {};

/**
 * @param {string} key
 * @return {Promise}
 */
Localforage.prototype.removeItem = function(key) {};

/**
 * @return {Promise}
 */
Localforage.prototype.clear = function() {};

/**
 * @return {Promise<Array<string>>}
 */
Localforage.prototype.keys = function() {};

/**
 * @return {Promise<number>}
 */
Localforage.prototype.length = function() {};

/**
 * @const {Localforage}
 */
var localforage;
