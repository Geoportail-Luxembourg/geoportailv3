/**
 * This file provides the "geoportailv3" namespace, which is the
 * application's main namespace. And it defines the application's Angular
 * module.
 */

/**
 * @module geoportailv3
 */
const exports = {};

import ngeoUtils from 'ngeo/utils.js';

/**
 * @type {!angular.Module}
 */
exports.module = angular.module('geoportailv3', []);

exports.module.config(['$compileProvider', function($compileProvider) {
  if (!('debug' in ngeoUtils.decodeQueryString(window.location.search))) {
    // Disable the debug info
    $compileProvider.debugInfoEnabled(false);
  }
}]);


export default exports;
