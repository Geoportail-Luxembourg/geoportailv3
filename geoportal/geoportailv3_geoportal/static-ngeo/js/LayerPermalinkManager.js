/**
 * @module app.LayerPermalinkManager
 */
/**
 * @fileoverview This files defines an Angular Service for managing the
 * selected layers permalinks
 */

import appModule from './module.js';
import appNotifyNotificationType from './NotifyNotificationType.js';
import appEventsThemesEventType from './events/ThemesEventType.js';
import {listen, unlistenByKey} from 'ol/events.js';
import {extend as arrayExtend} from 'ol/array.js';
import { useMapStore, urlStorage } from "luxembourg-geoportail/bundle/lux.dist.js";


/**
 * @constructor
 * @param {app.StateManager} appStateManager The state service.
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode The layer
 * service.
 * @param {app.Themes} appThemes The themes service.
 * @param {app.Theme} appTheme The theme service.
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr the background layer
 * manager.
 * @param {app.WmsHelper} appWmsHelper The wms helper service.
 * @param {app.WmtsHelper} appWmtsHelper The wmts helper service.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @ngInject
 */
const exports = function(appStateManager,
    appGetLayerForCatalogNode, appThemes, appTheme, ngeoBackgroundLayerMgr,
    appWmsHelper, appWmtsHelper, appNotify, appTimeLayer, gettextCatalog) {
  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

  /**
   * @type {app.TimeLayer}
   * @private
   */
  this.timeLayer_ = appTimeLayer;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * @type {app.WmsHelper}
   * @private
   */
  this.appWmsHelper_ = appWmsHelper;

  /**
   * @type {app.WmtsHelper}
   * @private
   */
  this.appWmtsHelper_ = appWmtsHelper;

  /**
   * @type {Array.<number|string>}
   * @private
   */
  this.unavailableLayers_ = [];

  /**
   * @type {Array.<number>}
   * @private
   */
  this.unavailableOpacities_ = [];

  /**
   * @type {Array.<number>}
   * @private
   */
  this.unavailableTimes_ = [];

  /**
   * @type {Array.<number>}
   * @private
   */
  this.unavailableLayerIndex_ = [];

  /**
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

  /**
   * @type {app.Theme}
   * @private
   */
  this.appTheme_ = appTheme;

  /**
   * @type {app.StateManager}
   * @private
   */
  this.stateManager_ = appStateManager;

  this.mapStore_ = useMapStore();

  /**
   * @type {ngeo.map.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  /**
   * @type {app.GetLayerForCatalogNode}
   * @private
   */
  this.getLayerFunc_ = appGetLayerForCatalogNode;

  /**
   * @type {function()|undefined}
   * @private
   */
  this.scopeWatcher_ = undefined;

  /**
   * @type {Array}
   * @private
   */
  this.layersListenerKeys_ = [];

  /**
   * @type {ol.EventsKey?}
   * @private
   */
  this.backgroundLayerMgrLstn_ = null;
};


/**
 * @const
 * @private
 */
exports.V2_BGLAYER_TO_V3_ = {
  'webbasemap': 'basemap_2015_global',
  'pixelmaps-color': 'topogr_global',
  'pixelmaps-gray': 'topo_bw_jpeg',
  'streets': 'streets_jpeg',
  'voidlayer': 'blank'
};


/**
 * Remove the listeners for property change.
 * @private
 */
exports.prototype.unListenPropertyChange_ = function() {
  this.layersListenerKeys_.forEach(function(key) {
    unlistenByKey(key);
  });
  this.layersListenerKeys_.length = 0;
};


/**
 * Add the listeners for property change.
 * @param {Array.<ol.layer.Layer>} layers The layers.
 * @private
 */
exports.prototype.listenPropertyChange = function(layers) {
  layers.forEach(function(layer) {
    this.layersListenerKeys_.push(listen(
        layer, 'propertychange',
        function() {
          this.onLayerUpdate_(layers);
        }, this)
    );
  }, this);
};


/**
 * @param {Array.<ol.layer.Layer>} layers_ The layers.
 * @private
 */
exports.prototype.onLayerUpdate_ = function(layers_) {
  let layers = layers_.filter(l => l.get('metadata') && !l.get('metadata').hidden);

  // Check if a layer is added or removed;
  if (layers.length !== this.layersListenerKeys_.length) {
    this.unListenPropertyChange_();
    this.listenPropertyChange(layers);
  }

  var layerIds = layers.map(function(layer) {
    return layer.get('queryable_id');
  });
  var opacities = layers.map(function(layer) {
    return layer.getOpacity();
  });
  var time_selections = layers.map(function(layer) {
    return layer.get('current_time');
  });
  var bgLayer = this.backgroundLayerMgr_.get(this.map_);
  var bgLabel = 'blank';
  if (bgLayer) {
    bgLabel = bgLayer.get('label');
  }
  this.stateManager_.updateState({
    'layers': layerIds.join('-'),
    'opacities': opacities.join('-'),
    'time': time_selections.join('--'),
    'bgLayer': bgLabel
  });
};


/**
 * @param {Array.<number|string>} layerIds The ids.
 * @param {Array.<number>} opacities The opacities.
 * @param {Array.<Object>} flatCatalog The catalog.
 * @private
 */
exports.prototype.applyLayerStateToMap_ = function(layerIds, opacities, times, flatCatalog) {
  layerIds.reverse();
  opacities.reverse();
  times.reverse();
  this.unavailableLayerIndex_.forEach(function(elem, index) {
    layerIds.splice(elem, 0,  this.unavailableLayers_[index]);
    opacities.splice(elem, 0, this.unavailableOpacities_[index]);
    times.splice(elem, 0, this.unavailableTimes_[index]);
  }, this);
  if (this.unavailableLayerIndex_.length > 0) {
    while(this.selectedLayers.length > 0) {
      this.map_.removeLayer(this.selectedLayers.pop());
    }
  }
  this.unavailableLayerIndex_ = [];
  this.unavailableLayers_ = [];
  this.unavailableOpacities_ = [];
  this.unavailableTimes_ = [];


  var addedLayers = this.map_.getLayers().getArray();
  layerIds.forEach(
  function(layerId, layerIndex) {
    if (typeof layerId == 'number' && !isNaN(layerId)) {
      var node = flatCatalog.find(function(catItem) {
        return catItem.id === layerId;
      });
      if (node !== undefined && node !== null) {
        var layer = this.getLayerFunc_(node);
        if (opacities !== undefined) {
          // set opacity trough metadata to not interfere
          // with the layer opacity manager service
          var layerMetadata = layer.get('metadata');
          if (!layerMetadata.hasOwnProperty('original_start_opacity')) {
            if (layerMetadata.hasOwnProperty('start_opacity')) {
              layerMetadata['original_start_opacity'] =
                layerMetadata['start_opacity'];
            } else {
              layerMetadata['original_start_opacity'] = 1;
            }
          }
          layerMetadata['start_opacity'] = opacities[layerIndex];
        }
        if (times.length > 0) {
          if (layerIndex <= times.length - 1 && times[layerIndex].length > 0) {
            this.timeLayer_.setTime(layer, times[layerIndex]);
            layer.set('current_time', times[layerIndex])
            // use min and max default values to restore previous state
            let time = layer.get('time');
            if (time !== undefined) {
              const default_times = times[layerIndex].split("/");
              time.minDefValue = default_times[0];
              if (default_times.length > 1 ) {
                time.maxDefValue = default_times[1];
              }
              layer.set('time', time);
            } else {
              console.log("Layer has no time information defined")
            }
          }
        }
        // Skip layers that have already been added
        if (addedLayers.every(function(addedLayer) {
          return addedLayer.get('queryable_id') !==
              layer.get('queryable_id');
        }, this)) {
          this.map_.addLayer(layer);
        }
      } else {
        this.setLayerAsUnavailable_(addedLayers, layerId,
            opacities[layerIndex], times[layerIndex], layerIndex);
        return;
      }
    } else {
      if (/** @type {string} */ (layerId).indexOf('WMTS||') === 0) {
        this.appWmtsHelper_.getLayerById(/** @type {string} */ (layerId)).
            then(function(rawLayer) {
              var values = layerId.split('%2D').join('-').split('||');
              var url = values[1];
              this.appWmtsHelper_.getCapabilities(url).then(function(capabilities) {
                if (rawLayer['options'] !== null) {
                  var wmtsLayer = this.appWmtsHelper_.createWmtsLayers(
                      this.map_, rawLayer, rawLayer['options']);
                  var wmtsMetadata = wmtsLayer.get('metadata');
                  if (!wmtsMetadata.hasOwnProperty('original_start_opacity')) {
                    if (wmtsMetadata.hasOwnProperty('start_opacity')) {
                      wmtsMetadata['original_start_opacity'] =
                        wmtsMetadata['start_opacity'];
                    } else {
                      wmtsMetadata['original_start_opacity'] = 1;
                    }
                  }
                  wmtsMetadata['start_opacity'] = opacities[layerIndex];
                  if (addedLayers.every(function(addedLayer) {
                    return addedLayer.get('queryable_id') !==
                        wmtsLayer.get('queryable_id');
                  }, this)) {
                    this.map_.addLayer(wmtsLayer);
                  }
                }
              }.bind(this));
            }.bind(this));
      } else  if (/** @type {string} */ (layerId).indexOf('WMS||') === 0) {
        this.appWmsHelper_.getLayerById(/** @type {string} */ (layerId)).
            then(function(rawLayer) {
              var wmsLayer = this.appWmsHelper_.createWmsLayers(
                  this.map_, rawLayer);
              var wmsMetadata = wmsLayer.get('metadata');
              if (!wmsMetadata.hasOwnProperty('original_start_opacity')) {
                if (wmsMetadata.hasOwnProperty('start_opacity')) {
                  wmsMetadata['original_start_opacity'] =
                    wmsMetadata['start_opacity'];
                } else {
                  wmsMetadata['original_start_opacity'] = 1;
                }
              }
              wmsMetadata['start_opacity'] = opacities[layerIndex];
              if (addedLayers.every(function(addedLayer) {
                return addedLayer.get('queryable_id') !==
                    wmsLayer.get('queryable_id');
              }, this)) {
                this.map_.addLayer(wmsLayer);
              }
            }.bind(this));
      } else {
        this.setLayerAsUnavailable_(addedLayers,
            /** @type {string} */ (layerId), opacities[layerIndex], times[layerIndex], layerIndex);
        return;
      }
    }
  }, this);
  if (this.unavailableLayers_.length > 0) {
    var msg = this.gettextCatalog.getString('Certaines couches sont protégées. Veuillez vous connecter avec un utilisateur disposant les droits de visualiser cette couche.');
    this.notify_(msg, appNotifyNotificationType.WARNING);
  }
};

/**
 * Tell if t leat one unavaillable layer is present.
 * @return {boolean} True if has at leat one unavaillable layer.
 */
exports.prototype.hasUnavailableLayers = function() {
  return (this.unavailableLayers_.length > 0);
};

/**
 * @param {Array<ol.layer.Layer>} addedLayers The mapLayers.
 * @param {string|number} layerId The id of the layer to remove.
 * @param {number} opacity The opacity of the layer to remove.
 * @param {number} layerIndex The index of the layer in the list.
 * @private
 */
exports.prototype.setLayerAsUnavailable_ = function(
  addedLayers, layerId, opacity, time, layerIndex) {
  var layerToRemove = /** @type{ol.layer.Base} */
      (addedLayers.find(function(addedLayer) {
        if (addedLayer.get('queryable_id') === layerId) {
          return true;
        }
        return false;
      }, this));
  if (layerToRemove !== null) {
    this.map_.removeLayer(layerToRemove);
  }
  this.unavailableLayers_.push(layerId);
  this.unavailableOpacities_.push(opacity);
  this.unavailableTimes_.push(time);
  this.unavailableLayerIndex_.push(layerIndex);
};


/**
 * @param {string} parameter The parameter.
 * @private
 * @return {Array.<number>|undefined} The values.
 */
exports.prototype.getStateValue_ = function(parameter) {
  var result = '';
  var response = this.stateManager_.getInitialValue(parameter);
  if (response !== undefined && response.length > 0) {
    result = response;
  } else {
    return undefined;
  }
  if (parameter === 'layers') {
    return this.splitLayers_(result, '-');
  }
  if (parameter === 'time') {
    return this.splitTimes_(result, '--');
  }
  return this.splitNumbers_(result, '-');
};


/**
 * @param {string} parameter The parameter to get.
 * @param {string} splitChar The char to split with.
 * @private
 * @return {Array.<number>|undefined} The values.
 */
exports.prototype.splitNumbers_ =
    function(parameter, splitChar) {
      var items = [];
      if (parameter !== undefined) {
        parameter.split(splitChar).forEach(function(string) {
          var value = parseFloat(string);
          if (typeof value == 'number' && !isNaN(value)) {
            items.push(value);
          }
        });
      }
      return items.length === 0 ? undefined : items;
    };


/**
 * @param {string} parameter The parameter to get.
 * @param {string} splitChar The char to split with.
 * @private
 * @return {Array.<number|string>|undefined} The values.
 */
exports.prototype.splitLayers_ =
    function(parameter, splitChar) {
      var items = [];
      if (parameter !== undefined) {
        parameter.split(splitChar).forEach(function(string) {
          var value = parseFloat(string);
          if (typeof value == 'number' && !isNaN(value)) {
            items.push(value);
          } else {
            if (string.indexOf('WMS||') === 0 ||
                string.indexOf('WMTS||') === 0) {
              items.push(string);
            }
          }
        });
      }
      return items.length === 0 ? undefined : items;
    };


/**
 * @param {string} parameter The parameter to get.
 * @param {string} splitChar The char to split with.
 * @private
 * @return {Array.<number|string>|undefined} The values.
 */
exports.prototype.splitTimes_ =
    function(parameter, splitChar) {
      var items = [];
      if (parameter !== undefined) {
        return parameter.split(splitChar)
      }
      return undefined;
    };


/**
 * @private
 */
exports.prototype.removeWatchers_ = function() {
  if (this.backgroundLayerMgrLstn_ !== null) {
    unlistenByKey(this.backgroundLayerMgrLstn_);
    this.backgroundLayerMgrLstn_ = null;
  }
  if (typeof this.scopeWatcher_ == 'function') {
    this.scopeWatcher_(); // destroy previous watcher
  }
  //this.unListenPropertyChange_();
};


/**
 * @param {Array.<ol.layer.Layer>} selectedLayers The selected layers.
 * @private
 */
exports.prototype.setupWatchers_ = function(selectedLayers) {

  this.backgroundLayerMgrLstn_ = listen(this.backgroundLayerMgr_, 'change',
      function() {
        var bgLayer = this.backgroundLayerMgr_.get(this.map_);
        this.stateManager_.updateState({
          'bgLayer': bgLayer.get('label')
        });
      }, this);

  // Add, Remove, Order
  this.scopeWatcher_ = this.scope_.$watchCollection(function() {
    return selectedLayers;
  }.bind(this), function(newColl) {
    this.onLayerUpdate_(selectedLayers);
  }.bind(this));
  //to be sure it's executed at least once.
  this.onLayerUpdate_(selectedLayers);
};


/**
 * @param {Array} element The element.
 * @return {Array} array The children.
 * @private
 */
exports.getAllChildren_ = function(element) {
  var array = [];
  for (var i = 0; i < element.length; i++) {
    if (element[i].hasOwnProperty('children')) {
      arrayExtend(array, exports.getAllChildren_(
          element[i].children)
      );
    } else {
      element[i].id = element[i].id;
      array.push(element[i]);
    }
  }
  return array;
};


/**
 * @param {angular.Scope} scope The scope.
 * @param {ol.Map} map The map.
 * @param {Array.<ol.layer.Layer>} selectedLayers The selected layers.
 */
exports.prototype.init = function(scope, map, selectedLayers) {
  /**
   * @type {Array.<ol.layer.Layer>}
   */
  this.selectedLayers = selectedLayers;

  /**
   * @type {angular.Scope}
   */
  this.scope_ = scope;

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = map;

  /**
   * @type {number}
   * @private
   */
  this.initialVersion_ = this.stateManager_.getVersion();

  this.mapStore_.setIs3dActive(this.stateManager_.getInitialValue('3d_enabled'))

  /**
   * @type {boolean}
   * @private
   */
  this.initialized_ = true;
};


/**
 * @param {Array.<ol.layer.Layer>} selectedLayers The selected layers.
 */
exports.prototype.initFlatCatalog_ = function(selectedLayers) {
  return this.appThemes_.getThemesPromise().then((root) => {
    const flatCatalog = this.appThemes_.flatCatalog;
    const ogcServers = root.ogcServers;
    /**
     * @type {Array.<number>|undefined}
     */
    var layerIds = [];
    /**
     * @type {Array.<number>|undefined}
     */
    var opacities = [];
    var times = [];
    if (!this.initialized_) {
      if (this.initialVersion_ === 2) {
        var layerString = this.stateManager_.getInitialValue('layers');
        if (layerString) {
          var layers = layerString.split(',');
          layers.forEach(stateLayerLabel => {
            var layer = flatCatalog.find(catalogueLayer => catalogueLayer['name'] === stateLayerLabel);
            layerIds.push(layer['id']);
          });
        }
        var opacitiesString = this.stateManager_.getInitialValue('layers_opacity');
        var visibilitiesString = this.stateManager_.getInitialValue('layers_visibility');
        if (opacitiesString !== undefined && opacitiesString !== null &&
            visibilitiesString !== undefined && visibilitiesString !== null &&
            visibilitiesString && opacitiesString) {
          var visibilities = visibilitiesString.split(',');
          opacitiesString.split(',').forEach(
              function(opacity, index) {
                if (visibilities[index] === 'true') {
                  opacities.push(parseFloat(opacity));
                } else {
                  opacities.push(0);
                }
              });
        }
        layerIds.reverse();
        opacities.reverse();

        this.stateManager_.deleteParam('layers_indices');
        this.stateManager_.deleteParam('layers_opacity');
        this.stateManager_.deleteParam('layers_visibility');
        this.stateManager_.deleteParam('bgOpacity');

      } else {
        layerIds = this.getStateValue_('layers');
        opacities = this.getStateValue_('opacities');
        times = this.getStateValue_('time');
      }
      this.initialized_ = true;
    } else {
      layerIds = this.splitLayers_(
          urlStorage.getItem('layers'), '-');
      opacities = this.splitNumbers_(
        urlStorage.getItem('opacities'), '-');
      times = this.splitTimes_(
            urlStorage.getItem('time'), '--');
    }
    this.removeWatchers_();
    if (layerIds === undefined) {
      layerIds = [];
      opacities = [];
      times = [];
    }
    // create empty list if times are undefined
    if (times == undefined) times = layerIds.map(i => '');
    if ((layerIds.length > 0 || this.unavailableLayerIndex_.length > 0) &&
        layerIds.length === opacities.length) {
      this.applyLayerStateToMap_(layerIds, opacities, times, flatCatalog, ogcServers);
    }
    this.setupWatchers_(selectedLayers);
  });
}
appModule.service('appLayerPermalinkManager', exports);


export default exports;
