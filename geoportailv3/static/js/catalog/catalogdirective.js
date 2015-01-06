goog.provide('app.catalogDirective');

goog.require('app');
goog.require('app.LayerFactory');
goog.require('ngeo.layertreeDirective');


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
        'ngeo-layertree-map="catalogCtrl.map"></div>'
  };
};


app.module.directive('appCatalog', app.catalogDirective);



/**
 * @constructor
 * @param {angular.$http} $http Angular http service.
 * @param {string} treeUrl Catalog tree URL.
 * @export
 * @ngInject
 */
app.CatalogController = function($http, treeUrl) {
  this['uid'] = goog.getUid(this);
  $http.get(treeUrl).then(goog.bind(
    /**
     * @param {angular.$http.Response} resp Ajax response.
     */
    function(resp) {
      this['tree'] = resp.data['items'][2];
    }, this));
};


/**
 * @param {Object} node Tree node.
 * @param {ol.layer.Layer} layer OpenLayers layer.
 * @export
 */
app.CatalogController.prototype.getInfo = function(node, layer) {
  window.alert(node['name']);
};


app.module.controller('AppCatalogController', app.CatalogController);
