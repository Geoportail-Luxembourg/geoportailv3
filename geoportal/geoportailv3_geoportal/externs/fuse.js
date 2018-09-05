/**
 * @fileoverview Externs for fuse.js
 * @see https://github.com/krisk/Fuse/blob/master/README.md
 * @externs
 */

/**
 * @typedef {{
 *    keys: Array.<string>,
 *    id: (string|undefined),
 *    threshold: (number|undefined),
 *    distance: (number|undefined),
 *    includeScore: (boolean|undefined)
 * }}
 */
var FuseOptions;

/**
 * @type {Array.<string>}
 */
FuseOptions.keys;

/**
 * @type {string|undefined}
 */
FuseOptions.id;

/**
 * @type {number|undefined}
 */
FuseOptions.threshold;

/**
 * @type {number|undefined}
 */
FuseOptions.distance;

/**
 * @type {boolean|undefined}
 */
FuseOptions.includeScore;

/**
 * @typedef {{
 *  item: (Object|string),
 *  score: number
 * }}
 */
var FuseResult;

/**
 * @type {Object|string}
 */
FuseResult.item;

/**
 * @type {number}
 */
FuseResult.score;

/**
 * @typedef {Array.<FuseResult>|Array.<string>}
 */
var FuseResults;

/**
 * @constructor
 * @param {Array} list
 * @param {FuseOptions} options
 */
function Fuse(list, options) {}

/**
 * @param {string} pattern
 * @return {FuseResults} results
 */
Fuse.prototype.search = function(pattern) {};

/**
* Sets a new list for Fuse to match against.
* @param {Array} list
* @return {Array} The newly set list
*/
Fuse.prototype.set = function(list) {};
