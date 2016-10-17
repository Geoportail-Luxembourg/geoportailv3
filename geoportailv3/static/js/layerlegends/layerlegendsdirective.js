/**
 * @fileoverview This file provides the layer manager directive. That directive
 * is used to create the list of selected layers in the page.
 *
 * Example:
 *
 * <app-layerlegends app-layerlegends-map="::mainCtrl.map"
 *     app-layerlegends-layers="::mainCtrl.selectedLayers">
 * </app-layerlegends>
 *
 * Note the use of the one-time binding operator (::) in the map and layers
 * expressions. One-time binding is used because we know the map and the array
 * of layers are not going to change during the lifetime of the application.
 * The content of the array of layers may change, but not the array itself.
 */
goog.provide('app.LayerlegendsController');
goog.provide('app.layerlegendsDirective');

goog.require('app');
goog.require('ngeo.sortableDirective');


/**
 * @param {string} appLayerlegendsTemplateUrl Url to layerlegends template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.layerlegendsDirective = function(appLayerlegendsTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'layers': '=appLayerlegendsLayers'
    },
    controller: 'AppLayerlegendsController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appLayerlegendsTemplateUrl
  };
};


app.module.directive('appLayerlegends', app.layerlegendsDirective);


/**
 * @param {angular.$sce} $sce Angular $sce service
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {string} getPngLegendUrl The url.
 * @constructor
 * @export
 */
app.LayerlegendsController = function($sce, gettextCatalog, getPngLegendUrl) {
  /**
   * @type {string}
   * @private
   */
  this.getPngLegendUrl_ = getPngLegendUrl;

  /**
   * @type {angular.$sce}
   * @private
   */
  this.sce_ = $sce;

  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @return {boolean} True if the layer as a legend.
 * @export
 */
app.LayerlegendsController.prototype.hasLegend = function(layer) {
  var localMetadata = /** @type {Object.<string, string>} */
      (layer.get('metadata'));
  return ('legend_name' in localMetadata);
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @return {*} the legend url.
 * @export
 */
app.LayerlegendsController.prototype.getLegendUrl = function(layer) {
  var localMetadata = /** @type {Object.<string, string>} */
    (layer.get('metadata'));
  var legend_name = ('legend_name' in localMetadata) ?
      localMetadata['legend_name'] : '';
  var currentLanguage = this.gettextCatalog.currentLanguage;
  return this.sce_.trustAsResourceUrl(
      '//wiki.geoportail.lu/doku.php?id=' +
      currentLanguage + ':legend:' +
      legend_name + '&do=export_html'
  );
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @return {*} the legend url.
 * @export
 */
app.LayerlegendsController.prototype.getImageLegendUrl = function(layer) {
  var localMetadata = /** @type {Object.<string, string>} */
    (layer.get('metadata'));
  var legend_name = ('legend_name' in localMetadata) ?
      localMetadata['legend_name'] : '';
  var currentLanguage = this.gettextCatalog.currentLanguage;
  return this.sce_.trustAsResourceUrl(
      this.getPngLegendUrl_ + '?lang=' +
      currentLanguage + '&name=' +
      legend_name
  );
};


app.module.controller('AppLayerlegendsController', app.LayerlegendsController);
