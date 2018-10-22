/**
 * @fileoverview This files defines an Angular Service for managing the
 * selected layers permalinks
 */

goog.provide('app.LayerPermalinkManager');

goog.require('app.module');
goog.require('app.NotifyNotificationType');
goog.require('app.events.ThemesEventType');
goog.require('ol.events');
goog.require('ol.ObjectEventType');
goog.require('ol.array');


/**
 * @constructor
 * @param {app.StateManager} appStateManager The state service.
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode The layer
 * service.
 * @param {app.Themes} appThemes The themes service.
 * @param {app.Theme} appTheme The theme service.
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr the background layer
 * manager.
 * @param {ngeo.statemanager.Location} ngeoLocation ngeo location service.
 * @param {app.WmsHelper} appWmsHelper The wms helper service.
 * @param {app.WmtsHelper} appWmtsHelper The wmts helper service.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @ngInject
 */
app.LayerPermalinkManager = function(appStateManager,
    appGetLayerForCatalogNode, appThemes, appTheme, ngeoBackgroundLayerMgr,
    ngeoLocation, appWmsHelper, appWmtsHelper, appNotify, gettextCatalog) {
  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

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
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

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
app.LayerPermalinkManager.V2_BGLAYER_TO_V3_ = {
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
app.LayerPermalinkManager.prototype.unListenProtertyChange_ = function() {
  this.layersListenerKeys_.forEach(function(key) {
    ol.events.unlistenByKey(key);
  });
  this.layersListenerKeys_.length = 0;
};


/**
 * Add the listeners for property change.
 * @param {Array.<ol.layer.Layer>} layers The layers.
 * @private
 */
app.LayerPermalinkManager.prototype.listenProtertyChange = function(layers) {
  layers.forEach(function(layer) {
    this.layersListenerKeys_.push(ol.events.listen(
        layer, ol.ObjectEventType.PROPERTYCHANGE,
        function() {
          this.onLayerUpdate_(layers);
        }, this)
    );
  }, this);
};


/**
 * @param {Array.<ol.layer.Layer>} layers The layers.
 * @private
 */
app.LayerPermalinkManager.prototype.onLayerUpdate_ = function(layers) {

  // Check if a layer is added or removed;
  if (layers.length !== this.layersListenerKeys_.length) {
    this.unListenProtertyChange_();
    this.listenProtertyChange(layers);
  }

  var layerIds = layers.map(function(layer) {
    return layer.get('queryable_id');
  });
  var opacities = layers.map(function(layer) {
    return layer.getOpacity();
  });
  var bgLayer = this.backgroundLayerMgr_.get(this.map_);
  var bgLabel = 'blank';
  if (bgLayer) {
    bgLabel = bgLayer.get('label');
  }
  this.stateManager_.updateState({
    'layers': layerIds.join('-'),
    'opacities': opacities.join('-'),
    'bgLayer': bgLabel
  });
};


/**
 * @param {Array.<number|string>} layerIds The ids.
 * @param {Array.<number>} opacities The opacities.
 * @param {Array.<Object>} flatCatalogue The catalog.
 * @private
 */
app.LayerPermalinkManager.prototype.applyLayerStateToMap_ = function(
    layerIds, opacities, flatCatalogue) {
  layerIds.reverse();
  opacities.reverse();
  this.unavailableLayerIndex_.forEach(function(elem, index) {
    layerIds.splice(elem, 0,  this.unavailableLayers_[index]);
    opacities.splice(elem, 0, this.unavailableOpacities_[index]);
  }, this);
  this.unavailableLayerIndex_ = [];
  this.unavailableLayers_ = [];
  this.unavailableOpacities_ = [];


  var addedLayers = this.map_.getLayers().getArray();
  layerIds.forEach(
  function(layerId, layerIndex) {
    if (typeof layerId == 'number' && !isNaN(layerId)) {
      var node = flatCatalogue.find(function(catItem) {
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
        // Skip layers that have already been added
        if (addedLayers.every(function(addedLayer) {
          return addedLayer.get('queryable_id') !==
              layer.get('queryable_id');
        }, this)) {
          this.map_.addLayer(layer);
        }
      } else {
        this.setLayerAsUnavailable_(addedLayers, layerId,
            opacities[layerIndex], layerIndex);
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
            /** @type {string} */ (layerId), opacities[layerIndex], layerIndex);
        return;
      }
    }
  }, this);
  if (this.unavailableLayers_.length > 0) {
    var msg = this.gettextCatalog.getString('Certaines couches sont protégées. Veuillez vous connecter avec un utilisateur disposant les droits de visualiser cette couche.');
    this.notify_(msg, app.NotifyNotificationType.WARNING);
  }
};

/**
 * Tell if t leat one unavaillable layer is present.
 * @return {boolean} True if has at leat one unavaillable layer.
 */
app.LayerPermalinkManager.prototype.hasUnavailableLayers = function() {
  return (this.unavailableLayers_.length > 0);
};

/**
 * @param {Array<ol.layer.Layer>} addedLayers The mapLayers.
 * @param {string|number} layerId The id of the layer to remove.
 * @param {number} opacity The opacity of the layer to remove.
 * @param {number} layerIndex The index of the layer in the list.
 * @private
 */
app.LayerPermalinkManager.prototype.setLayerAsUnavailable_ = function(
    addedLayers, layerId, opacity, layerIndex) {
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
  this.unavailableLayerIndex_.push(layerIndex);
};


/**
 * @param {string} parameter The parameter.
 * @private
 * @return {Array.<number>|undefined} The values.
 */
app.LayerPermalinkManager.prototype.getStateValue_ = function(parameter) {
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
  return this.splitNumbers_(result, '-');
};


/**
 * @param {string} parameter The parameter to get.
 * @param {string} splitChar The char to split with.
 * @private
 * @return {Array.<number>|undefined} The values.
 */
app.LayerPermalinkManager.prototype.splitNumbers_ =
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
app.LayerPermalinkManager.prototype.splitLayers_ =
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
 * @private
 */
app.LayerPermalinkManager.prototype.removeWatchers_ = function() {
  if (this.backgroundLayerMgrLstn_ !== null) {
    ol.events.unlistenByKey(this.backgroundLayerMgrLstn_);
    this.backgroundLayerMgrLstn_ = null;
  }
  if (typeof this.scopeWatcher_ == 'function') {
    this.scopeWatcher_(); // destroy previous watcher
  }
  //this.unListenProtertyChange_();
};


/**
 * @param {Array.<ol.layer.Layer>} selectedLayers The selected layers.
 * @private
 */
app.LayerPermalinkManager.prototype.setupWatchers_ = function(selectedLayers) {

  this.backgroundLayerMgrLstn_ = ol.events.listen(this.backgroundLayerMgr_, 'change',
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
app.LayerPermalinkManager.getAllChildren_ = function(element) {
  var array = [];
  for (var i = 0; i < element.length; i++) {
    if (element[i].hasOwnProperty('children')) {
      ol.array.extend(array, app.LayerPermalinkManager.getAllChildren_(
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
app.LayerPermalinkManager.prototype.init =
    function(scope, map, selectedLayers) {
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

  /**
   * @type {boolean}
   * @private
   */
      this.initialized_ = false;

  // Wait for themes to load before adding layers from state
      ol.events.listen(this.appThemes_, app.events.ThemesEventType.LOAD,
      function(evt) {
        this.appThemes_.getBgLayers().then(
            function(bgLayers) {
              var stateBgLayerLabel, stateBgLayerOpacity;
              var mapId = this.ngeoLocation_.getParam('map_id');
              if (!this.initialized_) {
                stateBgLayerLabel =
                    this.stateManager_.getInitialValue('bgLayer');
                stateBgLayerOpacity =
                    this.stateManager_.getInitialValue('bgOpacity');
                if ((stateBgLayerLabel !== undefined && stateBgLayerLabel !== null) ||
                    ((stateBgLayerOpacity !== undefined && stateBgLayerOpacity !== null) &&
                    parseInt(stateBgLayerOpacity, 0) === 0)) {
                  if (this.initialVersion_ === 2 &&
                      stateBgLayerLabel !== undefined && stateBgLayerLabel !== null) {
                    stateBgLayerLabel =
                        app.LayerPermalinkManager.
                        V2_BGLAYER_TO_V3_[stateBgLayerLabel];
                  } else if (this.initialVersion_ === 2 &&
                      parseInt(stateBgLayerOpacity, 0) === 0) {
                    stateBgLayerLabel = 'orthogr_2013_global';
                  }
                } else {
                  if (mapId === undefined) {
                    stateBgLayerLabel = 'basemap_2015_global';
                  } else {
                    if (this.appTheme_.getCurrentTheme() === 'tourisme') {
                      stateBgLayerLabel = 'topo_bw_jpeg';
                    } else {
                      stateBgLayerLabel = 'topogr_global';
                    }
                  }
                  stateBgLayerOpacity = 0;
                }
              } else {
                stateBgLayerLabel = this.ngeoLocation_.getParam('bgLayer');
                stateBgLayerOpacity =
                    this.ngeoLocation_.getParam('bgOpacity');
              }
              var hasBgLayerInUrl = (this.ngeoLocation_.getParam('bgLayer') !== undefined);
              if (mapId === undefined || hasBgLayerInUrl) {
                var layer = /** @type {ol.layer.Base} */
                    (bgLayers.find(function(layer) {
                      return layer.get('label') === stateBgLayerLabel;
                    }));
                this.backgroundLayerMgr_.set(this.map_, layer);
              }
              this.appThemes_.getFlatCatalog().then(
                  function(flatCatalogue) {
                    /**
                     * @type {Array.<number>|undefined}
                     */
                    var layerIds = [];
                    /**
                     * @type {Array.<number>|undefined}
                     */
                    var opacities = [];
                    if (!this.initialized_) {
                      if (this.initialVersion_ === 2) {
                        var layerString = this.stateManager_.
                            getInitialValue('layers');
                        if (layerString) {
                          var layers = layerString.split(',');
                          layers.forEach(
                              function(stateLayerLabel) {
                                var layer = flatCatalogue.find(
                                    function(catalogueLayer) {
                                      return catalogueLayer['name'] ===
                                          stateLayerLabel;
                                    }, this);
                                layerIds.push(layer['id']);
                              }, this);
                        }
                        var opacitiesString = this.stateManager_.
                            getInitialValue('layers_opacity');
                        var visibilitiesString = this.stateManager_.
                            getInitialValue('layers_visibility');
                        if (opacitiesString !== undefined && opacitiesString !== null &&
                            visibilitiesString !== undefined && visibilitiesString !== null &&
                            visibilitiesString &&
                            opacitiesString) {
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
                      }
                      this.initialized_ = true;
                    } else {
                      layerIds = this.splitLayers_(
                          this.ngeoLocation_.getParam('layers'), '-');
                      opacities = this.splitNumbers_(
                          this.ngeoLocation_.getParam('opacities'), '-');
                    }
                    this.removeWatchers_();
                    if (layerIds !== undefined && opacities !== undefined &&
                        layerIds.length > 0 &&
                        layerIds.length === opacities.length) {
                      this.applyLayerStateToMap_(layerIds, opacities,
                          flatCatalogue);
                    }
                    this.setupWatchers_(selectedLayers);
                  }.bind(this));
            }.bind(this));
      }, this);
    };

app.module.service('appLayerPermalinkManager', app.LayerPermalinkManager);
