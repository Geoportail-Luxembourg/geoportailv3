/**
 * @fileoverview This files defines an Angular Service for managing the
 * selected layers permalinks
 */

goog.provide('app.LayerPermalinkManager');

goog.require('app');
goog.require('app.GetLayerForCatalogNode');
goog.require('app.StateManager');
goog.require('app.Themes');
goog.require('goog.array');
goog.require('ngeo.BackgroundLayerMgr');



/**
 * @constructor
 * @param {app.StateManager} appStateManager
 * @param {ngeo.BackgroundLayerMgr} ngeoBackgroundLayerMgr
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode
 * @param {app.Themes} appThemes
 * @ngInject
 */
app.LayerPermalinkManager =
    function(appStateManager, ngeoBackgroundLayerMgr,
        appGetLayerForCatalogNode, appThemes) {
  /**
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

  /**
   * @type {app.StateManager}
   * @private
   */
  this.stateManager_ = appStateManager;

  /**
   * @type {ngeo.BackgroundLayerMgr}
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
};


/**
 * @const
 * @private
 */
app.LayerPermalinkManager.V2_BGLAYER_TO_V3_ = {
  'webbasemap' : 'basemap_2015_global',
  'topogr': 'topogr_global',
  'pixelmaps-gray': 'topo_bw_jpeg',
  'streets': 'streets_jpeg',
  'voidlayer': 'blank'
};


/**
 * @param {Array.<ol.layer.Layer>} layers
 * @private
 */
app.LayerPermalinkManager.prototype.setLayerState_ = function(layers) {
  var layerIds = goog.array.map(layers, function(layer) {
    return layer.get('queryable_id');
  });
  var opacities = goog.array.map(layers, function(layer) {
    return layer.getOpacity();
  });
  var bgLayer = this.backgroundLayerMgr_.get(this.map_);
  this.stateManager_.updateState({
    'layers': layerIds.join('-'),
    'opacities': opacities.join('-'),
    'bgLayer': bgLayer.get('label')
  });
};


/**
 * @param {Array.<number>} layerIds
 * @param {Array.<number>} opacities
 * @param {Array.<Object>} flatCatalogue
 * @private
 */
app.LayerPermalinkManager.prototype.applyLayerStateToMap_ =
    function(layerIds, opacities, flatCatalogue) {
  layerIds.reverse();
  opacities.reverse();
  var addedLayers = this.map_.getLayers().getArray();
  goog.array.forEach(layerIds,
      function(layerId, layerIndex) {
        /**
         * @type {ol.layer.Layer}
         */
        var layer = null;
        var node = goog.array.find(flatCatalogue, function(catItem) {
          return catItem.id === layerId;
        });
        if (goog.isDefAndNotNull(node)) {
          layer = this.getLayerFunc_(node);
        } else {
          return;
        }
        if (goog.isDef(opacities)) {
          // set opacity trough metadata to not interfere
          // with the layer opacity manager service
          layer.get('metadata')['start_opacity'] =
              opacities[layerIndex];
        }
        // Skip layers that have already been added
        if (goog.array.every(addedLayers, function(addedLayer) {
          return addedLayer.get('queryable_id') !==
              layer.get('queryable_id');
        }, this)) {
          this.map_.addLayer(layer);
        }
      }, this
  );
};


/**
 * @param {string} parameter
 * @private
 * @return {Array.<number>|undefined}
 */
app.LayerPermalinkManager.prototype.getStateValue_ = function(parameter) {
  var result = '';
  var response = this.stateManager_.getInitialValue(parameter);
  if (goog.isDef(response) && response.length > 0) {
    result = response;
  } else {
    return undefined;
  }
  var items = [];
  goog.array.forEach(result.split('-'), function(string) {
    var value = parseFloat(string);
    if (goog.isNumber(value)) {
      items.push(value);
    }
  });
  return items.length === 0 ? undefined : items;
};


/**
 * @param {Array.<ol.layer.Layer>} selectedLayers
 * @private
 */
app.LayerPermalinkManager.prototype.setupWatchers_ = function(selectedLayers) {

  goog.events.listen(this.backgroundLayerMgr_, ngeo.BackgroundEventType.CHANGE,
      function() {
        var bgLayer = this.backgroundLayerMgr_.get(this.map_);
        this.stateManager_.updateState({
          'bgLayer': bgLayer.get('label')
        });
      }, undefined, this);

  if (goog.isFunction(this.scopeWatcher_)) {
    this.scopeWatcher_(); // destroy previous watcher
  }
  this.scopeWatcher_ = this.scope_.$watchCollection(goog.bind(function() {
    return selectedLayers;
  }, this), goog.bind(function() {
    this.setLayerState_(selectedLayers);
  }, this));

  var layers = this.map_.getLayers();
  // Add event listeners to existing selected layers
  goog.array.forEach(layers.getArray(), function(layer) {
    goog.events.listen(layer, ol.ObjectEventType.PROPERTYCHANGE,
        function() {
          this.setLayerState_(selectedLayers);
        }, undefined, this);
  }, this);
  // Add event listener to all future selected layers
  goog.events.listen(layers, ol.CollectionEventType.ADD,
      /**
       * @param {ol.CollectionEventType} collEvt Collection event.
       */
      function(collEvt) {
        var layer = /** @type {ol.layer.Layer} */ (collEvt.element);
        goog.events.listen(layer, ol.ObjectEventType.PROPERTYCHANGE,
            /**
             * @param {ol.ObjectEventType} layerEvt Layer event
             */
            function(layerEvt) {
              this.setLayerState_(selectedLayers);
            }, undefined, this);
      }, undefined, this);
};


/**
 * @param {Array} element
 * @return {Array} array
 * @private
 */
app.LayerPermalinkManager.getAllChildren_ = function(element) {
  var array = [];
  for (var i = 0; i < element.length; i++) {
    if (element[i].hasOwnProperty('children')) {
      goog.array.extend(array, app.LayerPermalinkManager.getAllChildren_(
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
 * @param {angular.Scope} scope
 * @param {ol.Map} map
 * @param {Array.<ol.layer.Layer>} selectedLayers
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

  // Wait for themes to load before adding layers from state
  goog.events.listen(this.appThemes_, app.ThemesEventType.LOAD,
      /**
       * @param {goog.events.Event} evt Event.
       */
      function(evt) {
        this.appThemes_.getBgLayers().then(goog.bind(
            /**
             * @param {Array.<ol.layer.Base>} bgLayers
             */
            function(bgLayers) {
              var stateLayerLabel =
                  this.stateManager_.getInitialValue('bgLayer');
              if (goog.isDefAndNotNull(stateLayerLabel)) {
                if (this.initialVersion_ === 2) {
                  stateLayerLabel =
                      app.LayerPermalinkManager.
                      V2_BGLAYER_TO_V3_[stateLayerLabel];
                }
                var layer = /** @type {ol.layer.Base} */
                    (goog.array.find(bgLayers, function(layer) {
                  return layer.get('label') === stateLayerLabel;
                }));
                this.backgroundLayerMgr_.set(this.map_, layer);
              }
            }, this));

        this.appThemes_.getThemesObject().then(
            goog.bind(function(themes) {
              var flatCatalogue = [];
              for (var i = 0; i < themes.length; i++) {
                var theme = themes[i];
                goog.array.extend(flatCatalogue,
                    app.LayerPermalinkManager.getAllChildren_(theme.children)
                );
              }

              /**
               * @type {Array.<number>|undefined}
               */
              var layerIds = [];
              /**
               * @type {Array.<number>|undefined}
               */
              var opacities = [];

              if (this.initialVersion_ === 2) {
                var layerString = this.stateManager_.getInitialValue('layers');
                if (goog.isDefAndNotNull(layerString) &&
                    !goog.string.isEmpty(layerString)) {
                  var layers = layerString.split(',');
                  goog.array.forEach(layers,
                      function(stateLayerLabel) {
                        var layer = goog.array.find(flatCatalogue,
                            function(catalogueLayer) {
                              return catalogueLayer['name'] === stateLayerLabel;
                            }, this);
                        layerIds.push(layer['id']);
                      }, this);
                }
                var opacitiesString =
                    this.stateManager_.getInitialValue('layers_opacity');
                var visibilitiesString =
                  this.stateManager_.getInitialValue('layers_visibility');
                if (goog.isDefAndNotNull(opacitiesString) &&
                    goog.isDefAndNotNull(visibilitiesString) &&
                    !goog.string.isEmpty(visibilitiesString) &&
                    !goog.string.isEmpty(opacitiesString)) {
                  var visibilities = visibilitiesString.split(',');
                  goog.array.forEach(
                      opacitiesString.split(','),
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
              } else {
                layerIds = this.getStateValue_('layers');
                opacities = this.getStateValue_('opacities');
              }
              if (goog.isDef(layerIds) && goog.isDef(opacities) &&
                  layerIds.length > 0 && layerIds.length === opacities.length) {
                this.applyLayerStateToMap_(layerIds, opacities, flatCatalogue);
              }
              this.setupWatchers_(selectedLayers);
            }, this));
      }, undefined, this);
};

app.module.service('appLayerPermalinkManager', app.LayerPermalinkManager);
