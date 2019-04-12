/**
 * @fileoverview This file provides an Angular service to share which tool is
 * active.
 */
goog.module('app.Activetool');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');

/**
 * @param {app.draw.SelectedFeatures} appSelectedFeatures Selected features service.
 * @constructor
 * @ngInject
 */
exports = function(appSelectedFeatures) {

  /**
   * @type {ol.Collection<ol.Feature>}
   * @private
   */
  this.selectedFeatures_ = appSelectedFeatures;

  /**
   * @type {boolean}
   */
  this.drawActive = false;

  /**
   * @type {boolean}
   */
  this.measureActive = false;

  /**
   * @type {boolean}
   */
  this.streetviewActive = false;
};


/**
 * Is a tool activated
 * @return {boolean} The exploded features.
 */
exports.prototype.isActive = function() {
  return (this.drawActive || this.measureActive || this.streetviewActive);
};

appModule.service('appActivetool', exports);
