/**
 * @module app.ExclusionManager
 */
/**
 * @fileoverview This file defines the Exclusion service. This service manages
 * the exclusion between layers.
 */

import appModule from './module.js';
import appNotifyNotificationType from './NotifyNotificationType.js';

import {unByKey} from 'ol/Observable.js';
import {getChangeEventType} from 'ol/Object.js';
import {listen} from 'ol/events.js';
import olLayerProperty from 'ol/layer/Property.js';
import olCollectionEventType from 'ol/CollectionEventType.js';
import {getUid} from 'ol/index.js';


/**
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer
 *     manager.
 * @param {app.backgroundlayer.BlankLayer} appBlankLayer Blank layer service.
 * @param {app.Notify} appNotify Notify service.
 * @constructor
 * @ngInject
 */
const exports = function(gettextCatalog, ngeoBackgroundLayerMgr,
    appBlankLayer, appNotify) {

  /**
   * @type {ngeo.map.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  this.lux3dMgr_ = null;

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
  layers = layers.reduce((all, layer) => {
    if (layer.getLayers) {
      all.push(...layer.getLayers().getArray());
    } else {
      all.push(layer);
    }
    return all;
  }, []);
  this.lux3dMgr_.getWrappedActive3dLayers().forEach(l => layers.push(l));

  var len = layers.length;
  var i;
  var layer2;
  var msg;
  var gettextCatalog = this.gettextCatalog_;
  var layersToRemove = [];
  for (i = len - 1; i >= 0; i--) {
    layer2 = layers[i];
    if ((layer2 == layer1 || layer2.get('metadata') === undefined) ||
        (layer2.get('metadata')['exclusion'] === undefined) ||
        // check contents (layerX.layer_) for 3d layers which are inside a wrapper class
        ((layer1.layer_ !== undefined) && (layer2.layer_ !== undefined) && (layer1.layer_ === layer2.layer_))) {
      continue;
    }

    // check exclusion with current baselayer
    var exclusion2 = layer2.get('metadata')['exclusion'];
    opacity = layer2.getOpacity();
    if (this.intersects_(exclusion1, exclusion2) && (opacity > 0)) {
      // layer to exclude is not the current base layer
      var currentBgLayer = this.backgroundLayerMgr_.get(map);
      if (layer2 !== currentBgLayer) {
        layersToRemove.push(
            gettextCatalog.getString(/** @type {string} */(layer2.get('label')))
        );
        if (layer2.get('metadata').ol3d_type === undefined) {
          // 2D layer case
          map.removeLayer(layer2);
        } else {
          // 3D layer case
          this.lux3dMgr_.remove3dLayer(layer2.layer_);
        }
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
exports.prototype.init = function(map, lux3dMgr) {
  this.lux3dMgr_ = lux3dMgr;
  var layerOpacityListenerKeys = {};
  this.lux3dMgr_.on('add', function(e) {
    var newLayer = e.detail.newLayer;
    this.checkForLayerExclusion_(map, newLayer);
  }.bind(this));

  this.backgroundLayerMgr_.on('change', function(e) {
    var curBgLayer = this.backgroundLayerMgr_.get(map);
    this.checkForLayerExclusion_(map, curBgLayer);
  }.bind(this));

  // listen on layers being added to the map
  // base layers switch should fire the event as well
  listen(map.getLayers(), olCollectionEventType.ADD,
      /**
       * @param {ol.Collection.Event} e Collection event.
       */
      function(e) {
        var layer = /** @type {ol.layer.Layer} */ (e.element);
        this.checkForLayerExclusion_(map, layer);

        // listen on opacity change
        var key = listen(layer,
            getChangeEventType(olLayerProperty.OPACITY),
            function(e) {
              this.checkForLayerExclusion_(map, layer);
            }, this);
        layerOpacityListenerKeys[getUid(layer)] = key;
      }, this);

  // remove any listener on opacity change when layer is removed from map
  listen(map.getLayers(), olCollectionEventType.REMOVE,
      /**
       * @param {ol.Collection.Event} e Collection event.
       */
      function(e) {
        var layer = /** @type {ol.layer.Layer} */ (e.element);
        console.assert(getUid(layer) in layerOpacityListenerKeys);
        unByKey(layerOpacityListenerKeys[getUid(layer)]);
      }, this);
};
appModule.service('appExclusionManager', exports);


export default exports;
