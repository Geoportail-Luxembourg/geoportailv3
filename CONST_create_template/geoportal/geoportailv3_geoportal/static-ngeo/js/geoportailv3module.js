/**
 * This file provides the "geoportailv3" namespace, which is the
 * application's main namespace. And it defines the application's Angular
 * module.
 */
import {decodeQueryString} from 'ngeo/utils.js';
import angular from 'angular';

/**
 * @type {!angular.IModule}
 */
const module = angular.module('geoportailv3', []);

module.config(['$compileProvider', function($compileProvider) {
  if (!('debug' in decodeQueryString(window.location.search))) {
    // Disable the debug info
    $compileProvider.debugInfoEnabled(false);
  }
}]);


export default module;
