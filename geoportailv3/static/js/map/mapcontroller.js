/**
 * @fileoverview This file provides the "map" directive.
 *
 * Example:
 *
 * <app-map app-map-map="::mainCtrl.map"><app-map>
 */
goog.module('app.map.MapController');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');
const olMapProperty = goog.require('ol.MapProperty');
const olProj = goog.require('ol.proj');


/**
 * @param {app.StateManager} appStateManager State manager service.
 * @param {ngeox.miscDebounce} ngeoDebounce ngeo debounce service.
 * @constructor
 * @ngInject
 */
exports = function(appStateManager, ngeoDebounce) {
  var lurefToWebMercatorFn = olProj.getTransform('EPSG:2169', 'EPSG:3857');

  /** @type {ol.Map} */
  var map = this['map'];
  var view = map.getView();

  /** @type {number} */
  var version = appStateManager.getVersion();

  var zoom = appStateManager.getInitialValue('zoom');

  /** @type {number} */
  var viewZoom;
  if (zoom !== undefined) {
    viewZoom = version === 3 ? +zoom :
        exports.V2_ZOOM_TO_V3_ZOOM_[zoom];
  } else {
    viewZoom = 8;
  }

  var x = appStateManager.getInitialValue('X');
  var y = appStateManager.getInitialValue('Y');

  /** @type {ol.Coordinate} */
  var viewCenter;
  if (x !== undefined && y !== undefined) {
    viewCenter = version === 3 ?
        [+x, +y] : lurefToWebMercatorFn([+y, +x], undefined, 2);
  } else {
    viewCenter = olProj.transform([6, 49.7], 'EPSG:4326', 'EPSG:3857');
  }

  view.setCenter(viewCenter);
  view.setZoom(viewZoom);

  exports.updateState_(appStateManager, view);
  var updateStateFunc = ngeoDebounce(
      /**
       * @param {ol.Object.Event} e Object event.
       */
      function(e) {
        exports.updateState_(appStateManager, view);
      }, 300, /* invokeApply */ true);

  view.on('propertychange', updateStateFunc);
  map.on('propertychange', function(event) {
    if (event.key === olMapProperty.VIEW) {
      view.un('propertychange', updateStateFunc);
      view = map.getView();
      view.on('propertychange', updateStateFunc);
    }
  });
};


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
