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
goog.module('app.catalog.catalogDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @return {angular.Directive} The Directive Definition Object.
 */
exports = function() {
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


appModule.directive('appCatalog', exports);
