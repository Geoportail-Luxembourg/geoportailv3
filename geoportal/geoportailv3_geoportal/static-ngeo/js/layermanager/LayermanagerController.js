/**
 * @module app.layermanager.LayermanagerController
 */
/**
 * @fileoverview This file provides the layer manager directive. That directive
 * is used to create the list of selected layers in the page.
 *
 * Example:
 *
 * <app-layermanager app-layermanager-map="::mainCtrl.map"
 *     app-layermanager-layers="::mainCtrl.selectedLayers">
 * </app-layermanager>
 *
 * Note the use of the one-time binding operator (::) in the map and layers
 * expressions. One-time binding is used because we know the map and the array
 * of layers are not going to change during the lifetime of the application.
 * The content of the array of layers may change, but not the array itself.
 */

import appModule from '../module.js';
import olBase from 'ol.js';

/**
 * @param {ngeo.statemanager.Location} ngeoLocation Location service.
 * @constructor
 * @ngInject
 * @export
 */
const exports = function(ngeoLocation) {
  /**
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  this['uid'] = olBase.getUid(this);

  /**
   * Hash array to keep track of opacities set on layers.
   * @type {Object.<number, number>}
   * @private
   */
  this.opacities_ = {};
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @export
 */
exports.prototype.removeLayer = function(layer) {
  this['map'].removeLayer(layer);
};


/**
 * @param {angular.JQLite} element Element.
 * @param {Array.<ol.layer.Layer>} layers Layers.
 * @export
 */
exports.prototype.reorderCallback = function(element, layers) {
  for (var i = 0; i < layers.length; i++) {
    layers[i].setZIndex(layers.length - i);
  }
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @export
 */
exports.prototype.changeVisibility = function(layer) {
  var currentOpacity = layer.getOpacity();
  var newOpacity;
  var uid = olBase.getUid(layer);
  if (currentOpacity === 0) {
    if (this.opacities_[uid] !== undefined) {
      newOpacity = this.opacities_[uid];
    } else {
      newOpacity = 1;
    }
    // reset old opacity for later use
    delete this.opacities_[uid];
  } else {
    this.opacities_[uid] = currentOpacity;
    newOpacity = 0;
  }
  layer.setOpacity(newOpacity);
};

/**
 * Is layers comparator displayed.
 * @return {boolean} Returns true when comparator is shown.
 * @export
 */
exports.prototype.isLayersComparatorDisplayed = function() {
  return this['activeLC'] === true;
};

/**
 * Toggle layers comparator.
 * @export
 */
exports.prototype.toggleLayersComparator = function() {
  this['activeLC'] = !this['activeLC'];
  this.ngeoLocation_.updateParams({
    'lc': this['activeLC']
  });
};


appModule.controller('AppLayermanagerController', exports);


export default exports;
