/**
 * @module app.GetDevice
 */
/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "elevation" web service.
 */

import appModule from './module.js';

/**
 * @constructor
 * @param {Document} $document Document.
 * @param {angular.$window} $window Window.
 * @private
 * @ngInject
 */
const exports = function($document, $window) {
  /**
   * @type {Document}
   * @private
   */
  this.$document_ = $document;

  /**
   * @type {boolean}
   * @private
   */
  this.isHiDpi_ = $window.matchMedia(
              '(-webkit-min-device-pixel-ratio: 2), ' +
              '(min-device-pixel-ratio: 2), ' +
              '(min-resolution: 192dpi)'
      ).matches;
};


/**
  * @return {string} The device env.
 */
exports.prototype.findBootstrapEnvironment = function() {
  const envs = {
    'lg': '(min-width: 1200px)',
    'md': '(max-width: 1199px)',
    'sm': '(max-width: 992px)',
    'xs': '(max-width: 768px)',
  }

  for (const [env, mq] of Object.entries(envs)) {
    if (window.matchMedia(mq).matches) return env
  }
  return 'xs'
};


/**
  * @param {string} env to check.
  * @return {boolean} True if XS env screen.
 */
exports.prototype.testEnv = function(env) {
  return this.findBootstrapEnvironment() === env;
};


/**
  * @return {boolean} True if highdpi screen.
 */
exports.prototype.isHiDpi = function() {
  return this.isHiDpi_;
};

appModule.service('appGetDevice', exports);


export default exports;
