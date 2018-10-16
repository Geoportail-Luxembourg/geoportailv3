/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "elevation" web service.
 */
goog.provide('app.GetDevice');

goog.require('app.module');


/**
 * @constructor
 * @param {Document} $document Document.
 * @param {angular.$window} $window Window.
 * @private
 * @ngInject
 */
app.GetDevice = function($document, $window) {
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
app.GetDevice.prototype.findBootstrapEnvironment = function() {
  var envs = ['xs', 'sm', 'md', 'lg'];
  var el = $('<div>');
  angular.element(this.$document_[0].body).append(el);

  for (var i = envs.length - 1; i >= 0; i--) {
    var env = envs[i];
    el.addClass('hidden-' + env);
    if (el.is(':hidden')) {
      el.remove();
      return env;
    }
  }
  return envs[0];
};


/**
  * @param {string} env to check.
  * @return {boolean} True if XS env screen.
 */
app.GetDevice.prototype.testEnv = function(env) {
  return this.findBootstrapEnvironment() === env;
};


/**
  * @return {boolean} True if highdpi screen.
 */
app.GetDevice.prototype.isHiDpi = function() {
  return this.isHiDpi_;
};

app.module.service('appGetDevice', app.GetDevice);
