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
    controllerAs: 'ctrl',
    bindToController: true,
    template: '<div ngeo-layertree="ctrl.tree" ' +
        'ngeo-layertree-map="ctrl.map"></div>'
  };
};


app.module.directive('appCatalog', app.catalogDirective);



/**
 * @constructor
 * @param {angular.$http} $http Angular http service.
 * @param {string} treeUrl Catalog tree URL.
 * @ngInject
 */
app.CatalogController = function($http, treeUrl) {
  $http.get(treeUrl).then(goog.bind(function(resp) {
    this['tree'] = resp.data.items[2];
  }, this));
};


app.module.controller('AppCatalogController', app.CatalogController);
