/**
 * @fileoverview This file provides an Angular service for interacting
 * with the "elevation" web service.
 */
goog.provide('app.GetDevice');

goog.require('app');
goog.require('ol.proj');


/**
 * @typedef {function():string}
 */
app.GetDevice;


/**
 * @param {Document} $document Document.
 * @return {app.GetDevice} The getDevice function.
 * @private
 * @ngInject
 */
app.getDevice_ = function($document) {
  return findBootstrapEnvironment;

  /**
   * @return {string} The device env.
   */
  function findBootstrapEnvironment() {
    var envs = ['xs', 'sm', 'md', 'lg'];
    var el = $('<div>');
    angular.element($document[0].body).append(el);

    for (var i = envs.length - 1; i >= 0; i--) {
      var env = envs[i];
      el.addClass('hidden-' + env);
      if (el.is(':hidden')) {
        el.remove();
        return env;
      }
    }
    return envs[0];
  }
};


app.module.service('appGetDevice', app.getDevice_);
