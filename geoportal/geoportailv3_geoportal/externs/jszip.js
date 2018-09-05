/**
 * @fileoverview Externs for jszip
 *
 * @externs
 */


/**
 * @constructor
 */
var JSZip = function() {}

/**
* Sets a new list for Fuse to match against.
* @param {string} data The zipped data.
* @param {Object=} options The options.
* @return {Promise} The promise
*/
JSZip.prototype.loadAsync = function(data, options) {};
