/**
 * @fileoverview This file defines the Exclusion service. This service manages
 * the exclusion between layers.
 */
goog.module('app.ExclusionManager');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');
const appNotifyNotificationType = goog.require('app.NotifyNotificationType');
const olBase = goog.require('ol');
const olObservable = goog.require('ol.Observable');
const olObject = goog.require('ol.Object');
const olEvents = goog.require('ol.events');
const olLayerProperty = goog.require('ol.layer.Property');
const olCollectionEventType = goog.require('ol.CollectionEventType');


/**
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer
 *     manager.
 * @param {app.backgroundlayer.BlankLayer} appBlankLayer Blank layer service.
 * @param {app.Notify} appNotify Notify service.
 * @constructor
 * @ngInject
 */
exports = function(gettextCatalog, ngeoBackgroundLayerMgr,
    appBlankLayer, appNotify) {

  /**
   * @type {ngeo.map.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  /**
   * @type {app.backgroundlayer.BlankLayer}
   * @private
   */
  this.blankLayer_ = appBlankLayer;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * @type {angularGettext.Catalog}
   * @private
   */
  this.gettextCatalog_ = gettextCatalog;

};


/**
 * @param {string} one The first list of exclusions.
 * @param {string} two The second list of exclusions.
 * @return {boolean} Whether the array intersect or not.
 * @private
 */
exports.prototype.intersects_ = function(one, two) {
  var arr1 = /** @type {Array} */ (JSON.parse(one));
  var arr2 = /** @type {Array} */ (JSON.parse(two));
  var concat = arr1.concat(arr2);
  concat.sort();
  var i;
  var len = concat.length;
  for (i = 1; i < len; i++) {
    if (concat[i] == concat[i - 1]) {
      return true;
    }
  }
  return false;
};


/**
 * @param {ol.Map} map The OpenLayers Map.
 * @param {ol.layer.Layer} layer1 The layer which was added or for which the
 *     opacity property has changed.
 * @private
 */
exports.prototype.checkForLayerExclusion_ = function(map, layer1) {
  var opacity = layer1.getOpacity();
  // don't do anything if layer is not displayed on map
  if (opacity === 0) {
    return;
  }

  if (layer1.get('metadata') === undefined) {
    return;
  }
  var exclusion1 = layer1.get('metadata')['exclusion'];

  if (exclusion1 === undefined) {
    return;
  }

  var layers = map.getLayers().getArray();
  var len = layers.length;
  var i;
  var layer2;
  var msg;
  var gettextCatalog = this.gettextCatalog_;
  var layersToRemove = [];
  for (i = len - 1; i >= 0; i--) {
    layer2 = layers[i];
    if (layer2 == layer1 || layer2.get('metadata') === undefined ||
        layer2.get('metadata')['exclusion'] === undefined) {
      continue;
    }

    // check exclusion with current baselayer
    var exclusion2 = layer2.get('metadata')['exclusion'];
    opacity = layer2.getOpacity();
    if (this.intersects_(exclusion1, exclusion2) && opacity > 0) {
      // layer to exclude is not the current base layer
      if (i !== 0) {
        layersToRemove.push(
            gettextCatalog.getString(/** @type {string} */(layer2.get('label')))
        );
        map.removeLayer(layer2);
      } else {
        this.backgroundLayerMgr_.set(map, this.blankLayer_.getLayer());
        msg = gettextCatalog.getString(
            'Background has been deactivated because ' +
            'the layer {{layer}} cannot be displayed on top of it.',
          {
            'layer': gettextCatalog.getString(
                  /** @type {string} */(layer1.get('label')))
          }
            );
        this.notify_(msg, appNotifyNotificationType.WARNING);
      }
    }
  }
  if (layersToRemove.length) {
    msg = gettextCatalog.getPlural(
        layersToRemove.length,
        'The layer <b>{{layersToRemove}}</b> ' +
        'has been removed because it cannot be displayed while the layer ' +
        '<b>{{layer}}</b> is displayed',
        'The layers <b>{{layersToRemove}}</b> ' +
        'have been removed because they cannot be displayed while the layer ' +
        '<b>{{layer}}</b> is displayed',
      {
        'layersToRemove': layersToRemove.join(', '),
        'layer': gettextCatalog.getString(
              /** @type {string} */(layer1.get('label')))
      });
    this.notify_(msg, appNotifyNotificationType.WARNING);
  }
};


/**
 * @param {ol.Map} map The OpenLayers map.
 */
exports.prototype.init = function(map) {
  var layerOpacityListenerKeys = {};

  // listen on layers being added to the map
  // base layers switch should fire the event as well
  olEvents.listen(map.getLayers(), olCollectionEventType.ADD,
      /**
       * @param {ol.Collection.Event} e Collection event.
       */
      function(e) {
        var layer = /** @type {ol.layer.Layer} */ (e.element);
        this.checkForLayerExclusion_(map, layer);

        // listen on opacity change
        var key = olEvents.listen(layer,
            olObject.getChangeEventType(olLayerProperty.OPACITY),
            function(e) {
              this.checkForLayerExclusion_(map, layer);
            }, this);
        layerOpacityListenerKeys[olBase.getUid(layer)] = key;
      }, this);

  // remove any listener on opacity change when layer is removed from map
  olEvents.listen(map.getLayers(), olCollectionEventType.REMOVE,
      /**
       * @param {ol.Collection.Event} e Collection event.
       */
      function(e) {
        var layer = /** @type {ol.layer.Layer} */ (e.element);
        console.assert(olBase.getUid(layer) in layerOpacityListenerKeys);
        olObservable.unByKey(layerOpacityListenerKeys[olBase.getUid(layer)]);
      }, this);
};

appModule.service('appExclusionManager', exports);
