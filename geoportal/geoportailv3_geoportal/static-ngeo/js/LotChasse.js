/**
 * @module app.LotChasse
 */
/**
 * @fileoverview This file defines the Blank Layer service. This service
 * creates an empty layer and the corresponding spec.
 */

import appModule from './module.js';

/**
 * @constructor
 * @ngInject
 */
const exports = function() {
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
exports.prototype.setLotChasse = function(lot) {
  this.lotChasse_ = lot;
};

/**
 * Get the current "lot de chasse".
 * @return {string} The lot de chasse.
 */
exports.prototype.getLotChasse = function() {
  return this.lotChasse_;
};

appModule.service('appLotChasse', exports);


export default exports;
