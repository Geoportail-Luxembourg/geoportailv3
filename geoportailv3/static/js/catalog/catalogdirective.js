/**
 * @fileoverview This file provides the "catalog" directive. That directive is
 * used to create the catalog tree in the page. It is based on the
 * "ngeo-layertree" directive. And it relies on c2cgeoportal's "themes" web
 * service.
 *
 * Example:
 *
 * <app-catalog app-catalog-map="::mainCtrl.map"></app-catalog>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */
goog.provide('app.catalogDirective');

goog.require('app');
goog.require('app.GetLayerForCatalogNode');
goog.require('app.Themes');
goog.require('ngeo.layertreeDirective');


/**
 * @return {angular.Directive} The Directive Definition Object.
 */
app.catalogDirective = function() {
  return {
    restrict: 'E',
    scope: {
      'map': '=appCatalogMap',
      'currentTheme': '=appCatalogCurrenttheme'
    },
    controller: 'AppCatalogController',
    controllerAs: 'catalogCtrl',
    bindToController: true,
    template: '<div ngeo-layertree="catalogCtrl.tree" ' +
        'ngeo-layertree-map="catalogCtrl.map" ' +
        'ngeo-layertree-nodelayer="catalogCtrl.getLayer(node)"></div>'
  };
};


app.module.directive('appCatalog', app.catalogDirective);



/**
 * @constructor
 * @param {angular.Scope} $scope Scope.
 * @param {app.Themes} appThemes Themes service.
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode Function to
 *     create layers from catalog nodes.
 * @export
 * @ngInject
 */
app.CatalogController = function($scope, appThemes,
    appGetLayerForCatalogNode) {

  $scope.$watch(goog.bind(function() {
    return this['currentTheme'];
  }, this), goog.bind(function() {
    appThemes.getThemeObject(this['currentTheme']).then(goog.bind(
        /**
         * @param {Object} tree Tree object for the theme.
         */
        function(tree) {
          this['tree'] = tree;
        }, this));
  }, this));

  /**
   * @type {app.GetLayerForCatalogNode}
   * @private
   */
  this.getLayerFunc_ = appGetLayerForCatalogNode;
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


app.module.controller('AppCatalogController', app.CatalogController);
