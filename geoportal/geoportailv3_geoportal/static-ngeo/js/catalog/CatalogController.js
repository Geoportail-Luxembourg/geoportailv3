/**
 * @module app.catalog.CatalogController
 */
/**
 * @fileoverview This file provides the "catalog" directive. That directive is
 * used to create the catalog tree in the page. It is based on the
 * "ngeo-layertree" directive. And it relies on c2cgeoportal's "themes" web
 * service.
 *
 * Example:
 *
 * <app-catalog app-catalog-map="::mainCtrl.map">
 * </app-catalog>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */

import appModule from '../module.js';
import appEventsThemesEventType from '../events/ThemesEventType.js';
import {listen} from 'ol/events.js';
import {transformExtent} from 'ol/proj.js';
import olView from 'ol/View.js';

/**
 * @constructor
 * @param {angular.Scope} $scope Scope.
 * @param {app.Themes} appThemes Themes service.
 * @param {app.Theme} appTheme the current theme service.
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode Function to
 *     create layers from catalog nodes.
 * @param {app.ScalesService} appScalesService Service returning scales.
 * @param {Array.<number>} maxExtent Constraining extent.
 * @param {app.StateManager} appStateManager The state service.
 * @param {ngeo.statemanager.Location} ngeoLocation ngeo location service.
 * @export
 * @ngInject
 */
const exports = function($scope, appThemes, appTheme,
    appGetLayerForCatalogNode, appScalesService, maxExtent, appStateManager, ngeoLocation) {


  this.scope_ = $scope;

  /**
   * @type {app.StateManager}
   * @private
   */
  this.appStateManager_ = appStateManager;

  /**
   * @type {ol.Extent}
   * @private
   */
  this.maxExtent_ =
      transformExtent(maxExtent, 'EPSG:4326', 'EPSG:3857');

  /**
   * @type {app.ScalesService}
   * @private
   */
  this.scales_ = appScalesService;

  /**
   * @type {app.Theme}
   * @private
   */
  this.appTheme_ = appTheme;

  /**
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

  /**
   * @type {app.GetLayerForCatalogNode}
   * @private
   */
  this.getLayerFunc_ = appGetLayerForCatalogNode

  /**
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  listen(appThemes, appEventsThemesEventType.LOAD,
      /**
       * @param {ol.events.Event} evt Event.
       */
      (function(evt) {
        this.setTree_();
      }), this);

  this.scope_.$watch(function() {
    return this.appTheme_.getCurrentTheme();
  }.bind(this), function(newVal, oldVal) {
    if (newVal !== oldVal) {
      this.setTree_();
    }
  }.bind(this));

};

exports.prototype.$onInit = function() {
  this.map_ = this['map']

  this.scope_.$watch(
    () => {
      if (!this.map_.get('ol3dm')) return;
      return this.map_.get('ol3dm').is3dEnabled();
    },
    enabled => {
      if (enabled === undefined) return;
      if (enabled) {
        this.tree.children.unshift({
          id: -1,
          name: "3d Layers",
          metadata: {},
          children: this.map_.get('ol3dm').getAvailableLayers().map(
            (elem, i) => ({ id: i, name: elem.name, layer: elem.layer, metadata: elem.metadata})
          ),
          type: "Cesium",
          ogcServer: "None",
          mixed: true,
          theme: this.appTheme_.getCurrentTheme()
        })
      } else {
        if (this.tree !== undefined && this.tree !== null) {
          const idx = this.tree.children.findIndex((e) => e.id === -1);
          if (idx > -1) {
            this['tree'].children.splice(idx, 1);
          }
        }
      }
    }
  )
};

exports.prototype.is3dEnabled = function() {
  if (!this.map_.get('ol3dm')) return false;
  return this.map_.get('ol3dm').is3dEnabled();
};


/**
 * Return the OpenLayers layer for this node. `null` is returned if the node
 * is not a leaf.
 * @param {Object} node Tree node.
 * @return {ol.layer.Layer} The OpenLayers layer.
 * @export
 */
exports.prototype.getLayer = function(node) {
  return this.getLayerFunc_(node);
};

exports.prototype.getActive = function(layertreeController) {
  const layer3dmanager = this.map_.get('ol3dm')
  if (layer3dmanager) {
    if (layer3dmanager.getActiveLayerName().find(e => e === layertreeController.node.layer)) {
      return true
    }
  }
  return layertreeController.getSetActive()
}

/**
 * @private
 */
exports.prototype.setTree_ = function() {
  this.appThemes_.getThemeObject(
      this.appTheme_.getCurrentTheme()).then(
      /**
       * @param {Object} tree Tree object for the theme.
       */
      (function(tree) {
        this['tree'] = tree;
        if (this['tree'] !== undefined && this['tree'] !== null) {
          const idx = this.tree.children.findIndex((e) => ('display_in_switcher' in e.metadata && e.metadata['display_in_switcher'] === false));
          if (idx > -1) {
            this['tree'].children.splice(idx, 1);
          }
        }
        this.setThemeZooms(this['tree']);
      }).bind(this));
};


/**
 * @param {Object} tree Tree object for the theme.
 * Set the maximum scale regarding the loaded theme.
 */
exports.prototype.setThemeZooms = function(tree) {
  var maxZoom = 19;
  if (tree !== null) {
    console.assert('metadata' in tree);
    if (tree['metadata']['resolutions']) {
      var resolutions = tree['metadata']['resolutions'];
      maxZoom = resolutions.length + 7;
    }

    var currentView = this.map_.getView();

    let rotation = 0;
    if (this.ngeoLocation_.getParam('rotation') !== undefined) {
      rotation = Number(this.ngeoLocation_.getParam('rotation'));
    }

    this.map_.setView(new olView({
      maxZoom: maxZoom,
      minZoom: 8,
      extent: this.maxExtent_,
      center: currentView.getCenter(),
      enableRotation: true,
      zoom: currentView.getZoom(),
      constrainResolution: true,
      rotation,
    }));
  }
  this.scales_.setMaxZoomLevel(maxZoom);
  var viewZoom = this.map_.getView().getZoom();
  this.appStateManager_.updateState({
    'zoom': viewZoom
  });
};

/**
 * Add or remove layer from map.
 * @param {Object} node Tree node.
 * @export
 */
exports.prototype.toggle = function(node) {
  // is it an openlayers layer of a cesium layer
  const olcs = this.map_.get('ol3dm');
  if (olcs.getAvailableLayerName().indexOf(node.layer) !== -1) {
    if (olcs.tilesets3d.findIndex(e => e._url.includes(node.layer)) !== -1) {
      olcs.remove3dLayer(node.layer);
    } else {
      olcs.add3dTile(node.layer)
    }
  } else {
    var layer = this.getLayerFunc_(node);
    var map = this.map_;
    if (map.getLayers().getArray().indexOf(layer) >= 0) {
      map.removeLayer(layer);
    } else {
      var layerMetadata = layer.get('metadata');
      if (layerMetadata.hasOwnProperty('start_opacity') &&
          layerMetadata.hasOwnProperty('original_start_opacity')) {
        layerMetadata['start_opacity'] = layerMetadata['original_start_opacity'];
      }
      map.addLayer(layer);
      if (layerMetadata.hasOwnProperty('linked_layers')) {
        var layers = layerMetadata['linked_layers'];
        layers.forEach(function(layerId) {
          this.appThemes_.getFlatCatalog().then(
            function(flatCatalog) {
              var node2 = flatCatalog.find(function(catItem) {
                return catItem.id === Number(layerId);
              });
              if (node2 !== undefined) {
                var linked_layer = this.getLayerFunc_(node2);
                map.addLayer(linked_layer);
              }
            }.bind(this));
        }, this);
      }
    }
  }
};


appModule.controller('AppCatalogController', exports);


export default exports;
