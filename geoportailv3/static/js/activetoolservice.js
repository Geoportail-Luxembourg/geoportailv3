/**
 * @fileoverview This file provides an Angular service to share which tool is
 * active.
 */
goog.provide('app.Activetool');

goog.require('app');
goog.require('app.SelectedFeatures');

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
};


/**
 * Is a tool activated
 * @return {boolean} The exploded features.
 */
app.Activetool.prototype.isActive = function() {
  return (this.drawActive || this.measureActive ||
    this.selectedFeatures_.getLength() > 0);
};

app.module.service('appActivetool', app.Activetool);
