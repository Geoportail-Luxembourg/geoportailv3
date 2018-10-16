/**
 * @fileoverview This file provides the "map" directive.
 *
 * Example:
 *
 * <app-map app-map-map="::mainCtrl.map"><app-map>
 */
goog.provide('app.map.MapController');

goog.require('app.module');
goog.require('ol.MapProperty');
goog.require('ol.proj');


/**
 * @param {app.StateManager} appStateManager State manager service.
 * @param {ngeox.miscDebounce} ngeoDebounce ngeo debounce service.
 * @constructor
 * @ngInject
 */
app.map.MapController = function(appStateManager, ngeoDebounce) {
  var lurefToWebMercatorFn = ol.proj.getTransform('EPSG:2169', 'EPSG:3857');

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
        app.map.MapController.V2_ZOOM_TO_V3_ZOOM_[zoom];
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
    viewCenter = ol.proj.transform([6, 49.7], 'EPSG:4326', 'EPSG:3857');
  }

  view.setCenter(viewCenter);
  view.setZoom(viewZoom);

  app.map.MapController.updateState_(appStateManager, view);
  var updateStateFunc = ngeoDebounce(
      /**
       * @param {ol.Object.Event} e Object event.
       */
      function(e) {
        app.map.MapController.updateState_(appStateManager, view);
      }, 300, /* invokeApply */ true);

  view.on('propertychange', updateStateFunc);
  map.on('propertychange', function(event) {
    if (event.key === ol.MapProperty.VIEW) {
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
app.map.MapController.V2_ZOOM_TO_V3_ZOOM_ = {
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
app.map.MapController.updateState_ = function(appStateManager, view) {
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


app.module.controller('AppMapController', app.map.MapController);
