/**
 * @module app.map.MapController
 */
/**
 * @fileoverview This file provides the "map" directive.
 *
 * Example:
 *
 * <app-map app-map-map="::mainCtrl.map"><app-map>
 */

import appModule from '../module.js';
import olMapProperty from 'ol/MapProperty.js';
import {getTransform, transform} from 'ol/proj.js';
import offlineUtils from 'ngeo/offline/utils.js';

/**
 * @param {app.StateManager} appStateManager State manager service.
 * @param {ngeox.miscDebounce} ngeoDebounce ngeo debounce service.
 * @constructor
 * @ngInject
 */
const exports = function(appStateManager, ngeoDebounce) {

  this.appStateManager_ = appStateManager;

  this.ngeoDebounce_ = ngeoDebounce;
};

exports.prototype.$onInit = function() {
  var lurefToWebMercatorFn = getTransform('EPSG:2169', 'EPSG:3857');

  /** @type {ol.Map} */
  var map = this['map'];
  var view = map.getView();

  /** @type {number} */
  var version = this.appStateManager_.getVersion();

  var zoom = this.appStateManager_.getInitialValue('zoom');

  /** @type {number} */
  var viewZoom;
  if (zoom !== undefined) {
    viewZoom = version === 3 ? +zoom :
        exports.V2_ZOOM_TO_V3_ZOOM_[zoom];
  } else {
    viewZoom = 8;
  }

  var x = this.appStateManager_.getInitialValue('X');
  var y = this.appStateManager_.getInitialValue('Y');
  var srs = this.appStateManager_.getInitialValue('SRS');
  this.appStateManager_.deleteParam('SRS');
  /** @type {ol.Coordinate} */
  var viewCenter;
  if (x !== undefined && y !== undefined) {
    if (version === 3 && srs !== undefined) {
      viewCenter = transform([+x, +y], srs, 'EPSG:3857');
    } else {
      viewCenter = version === 3 ?
          [+x, +y] : lurefToWebMercatorFn([+y, +x], undefined, 2);
    }
  } else {
    viewCenter = transform([6, 49.7], 'EPSG:4326', 'EPSG:3857');
  }

  view.setCenter(viewCenter);
  view.setZoom(viewZoom);

  exports.updateState_(this.appStateManager_, view);
  var updateStateFunc = this.ngeoDebounce_(() => {
      exports.updateState_(this.appStateManager_, view);
  }, 300, /* invokeApply */ true);

  view.on('propertychange', updateStateFunc);
  map.on('propertychange', function(event) {
    if (event.key === olMapProperty.VIEW) {
      view.un('propertychange', updateStateFunc);
      view = map.getView();
      view.on('propertychange', updateStateFunc);
    }
  });
  const check = function() {
    map.updateSize();
    map.renderSync();
    offlineUtils.traverseLayer(map.getLayerGroup(), [], layer => {
      if (layer.getMapBoxMap) {
        const mbm = layer.getMapBoxMap();
        mbm.resize();
      }
      return true;
    });
  };
  ["", "webkit", "moz", "ms"].forEach(
      prefix => document.addEventListener(prefix + 'fullscreenchange', check, false)
  );

}

/**
 * @const
 * @private
 */
exports.V2_ZOOM_TO_V3_ZOOM_ = {
  '0': 8,
  '1': 9,
  '2': 9,
  '3': 10,
  '4': 11,
  '5': 12,
  '6': 13,
  '7': 14,
  '8': 16,
  '9': 17,
  '10': 18,
  '11': 19,
  '12': 20,
  '13': 21
};


/**
 * @param {app.StateManager} appStateManager Application state manager.
 * @param {ol.View} view Map view.
 * @private
 */
exports.updateState_ = function(appStateManager, view) {
  var viewZoom = view.getZoom();
  var viewCenter = view.getCenter();
  console.assert(viewCenter !== undefined);
  if (viewZoom) {
    // FIXME 3D
    // Update the state IF the zoom is defined (not in 3D)
    appStateManager.updateState({
      'zoom': viewZoom,
      'X': Math.round(viewCenter[0]),
      'Y': Math.round(viewCenter[1])
    });
  }
};


appModule.controller('AppMapController', exports);


export default exports;
