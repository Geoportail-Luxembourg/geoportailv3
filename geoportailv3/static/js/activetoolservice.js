/**
 * @fileoverview This file provides an Angular service to share which tool is
 * active.
 */
goog.provide('app.Activetool');

goog.require('app.module');

/**
 * @param {app.SelectedFeatures} appSelectedFeatures Selected features service.
 * @constructor
 * @ngInject
 */
app.Activetool = function(appSelectedFeatures) {

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
app.Activetool.prototype.isActive = function() {
  return (this.drawActive || this.measureActive || this.streetviewActive);
};

app.module.service('appActivetool', app.Activetool);
