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
goog.provide('app.CatalogController');
goog.provide('app.catalogDirective');

goog.require('app.module');
goog.require('app.ThemesEventType');
goog.require('goog.asserts');
goog.require('ol.events');
goog.require('ol.proj');
goog.require('ol.View');


/**
 * @return {angular.Directive} The Directive Definition Object.
 */
app.catalogDirective = function() {
  return {
    restrict: 'E',
    scope: {
      'map': '=appCatalogMap'
    },
    controller: 'AppCatalogController',
    controllerAs: 'catalogCtrl',
    bindToController: true,
    template: '<div ngeo-layertree="catalogCtrl.tree" ' +
        'ngeo-layertree-map="catalogCtrl.map" ' +
        'ngeo-layertree-nodelayer="catalogCtrl.getLayer(node)" ' +
        'class="themes-switcher collapse in"></div>'
  };
};


app.module.directive('appCatalog', app.catalogDirective);


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
 * @export
 * @ngInject
 */
app.CatalogController = function($scope, appThemes, appTheme,
    appGetLayerForCatalogNode, appScalesService, maxExtent, appStateManager) {
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
      ol.proj.transformExtent(maxExtent, 'EPSG:4326', 'EPSG:3857');

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
  this.getLayerFunc_ = appGetLayerForCatalogNode;

  ol.events.listen(appThemes, app.ThemesEventType.LOAD,
      /**
       * @param {ol.events.Event} evt Event.
       */
      function(evt) {
        this.setTree_();
      }, this);

  $scope.$watch(goog.bind(function() {
    return this.appTheme_.getCurrentTheme();
  }, this), goog.bind(function(newVal, oldVal) {
    if (newVal !== oldVal) {
      this.setTree_();
    }
  }, this));

};


/**
 * Return the OpenLayers layer for this node. `null` is returned if the node
 * is not a leaf.
 * @param {Object} node Tree node.
 * @return {ol.layer.Layer} The OpenLayers layer.
 * @export
 */
app.CatalogController.prototype.getLayer = function(node) {
  var layer = this.getLayerFunc_(node);
  return layer;
};


/**
 * @private
 */
app.CatalogController.prototype.setTree_ = function() {
  this.appThemes_.getThemeObject(
      this.appTheme_.getCurrentTheme()).then(goog.bind(
      /**
       * @param {Object} tree Tree object for the theme.
       */
      function(tree) {
        this['tree'] = tree;
        this.setThemeZooms(this['tree']);
      }, this));
};


/**
 * @param {Object} tree Tree object for the theme.
 * Set the maximum scale regarding the loaded theme.
 */
app.CatalogController.prototype.setThemeZooms = function(tree) {
  var maxZoom = 19;
  if (!goog.isNull(tree)) {
    goog.asserts.assert('metadata' in tree);
    if (tree['metadata']['resolutions']) {
      var resolutions = tree['metadata']['resolutions'].split(',');
      maxZoom = resolutions.length + 7;
    }
    var map = this['map'];
    var currentView = map.getView();
    map.setView(new ol.View({
      maxZoom: maxZoom,
      minZoom: 8,
      extent: this.maxExtent_,
      center: currentView.getCenter(),
      enableRotation: false,
      zoom: currentView.getZoom()
    }));
  }
  this.scales_.setMaxZoomLevel(maxZoom);
  var viewZoom = this['map'].getView().getZoom();
  this.appStateManager_.updateState({
    'zoom': viewZoom
  });
};

/**
 * Add or remove layer from map.
 * @param {Object} node Tree node.
 * @export
 */
app.CatalogController.prototype.toggle = function(node) {
  var layer = this.getLayerFunc_(node);
  var map = this['map'];
  if (map.getLayers().getArray().indexOf(layer) >= 0) {
    map.removeLayer(layer);
  } else {
    var layerMetadata = layer.get('metadata');
    if (layerMetadata.hasOwnProperty('start_opacity') &&
        layerMetadata.hasOwnProperty('original_start_opacity')) {
      layerMetadata['start_opacity'] = layerMetadata['original_start_opacity'];
    }
    map.addLayer(layer);
  }
};


app.module.controller('AppCatalogController', app.CatalogController);
