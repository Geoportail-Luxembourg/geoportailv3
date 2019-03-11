/**
 * @fileoverview This file defines the Blank Layer service. This service
 * creates an empty layer and the corresponding spec.
 */
goog.provide('app.LotChasse');

goog.require('app');


/**
 * @constructor
 * @ngInject
 */
app.LotChasse = function() {
  /**
   * @typedef {String}
   * @private
   */
  this.lotChasse_ = '';

};


/**
 * Set the current "lot de chasse".
 * @param {string} lot The lot de chasse.
 */
app.LotChasse.prototype.setLotChasse = function(lot) {
  this.lotChasse_ = lot;
};

/**
 * Get the current "lot de chasse".
 * @return {string} The lot de chasse.
 */
app.LotChasse.prototype.getLotChasse = function() {
  return this.lotChasse_;
};

app.module.service('appLotChasse', app.LotChasse);
