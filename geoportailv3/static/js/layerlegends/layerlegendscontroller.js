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
goog.provide('app.layerlegends.LayerlegendsController');

goog.require('app.module');
goog.require('goog.array');


/**
 * @param {angular.$http} $http The angular http service.
 * @param {angular.$sce} $sce Angular $sce service
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @param {string} getPngLegendUrl The url.
 * @param {string} getHtmlLegendUrl The url.
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer
 *     manager.
 * @constructor
 * @ngInject
 * @export
 */
app.layerlegends.LayerlegendsController = function($http, $sce, gettextCatalog,
    getPngLegendUrl, getHtmlLegendUrl, ngeoBackgroundLayerMgr) {
  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = this['map'];

  /**
   * @type {ngeo.map.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  /**
   * @type {Object.<string, !angular.$q.Promise>}
   * @private
   */
  this.promises_ = {};

  /**
   * @type {Object.<string, *>}
   * @private
   */
  this.results_ = {};

  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

  /**
   * @type {string}
   * @private
   */
  this.getHtmlLegendUrl_ = getHtmlLegendUrl;

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
app.layerlegends.LayerlegendsController.prototype.hasLegend = function(layer) {
  if (layer !== undefined && layer !== null) {
    var localMetadata = /** @type {Object.<string, string>} */
        (layer.get('metadata'));

    var isLegendAvailable = (localMetadata !== undefined &&
      'legend_name' in localMetadata);
    if (!isLegendAvailable) {
      return false;
    }

    var legend_name = ('legend_name' in localMetadata) ?
        localMetadata['legend_name'] : '';
    var currentLanguage = this.gettextCatalog.currentLanguage;

    var legendUrl = this.getHtmlLegendUrl_ + '?lang=' +
        currentLanguage + '&name=' + legend_name;


    if (!(legendUrl in this.promises_)) {
      this.promises_[legendUrl] = this.$http_.get(legendUrl).then(
        function(resp) {
          this.results_[legendUrl] = this.sce_.trustAsHtml(resp.data);
        }.bind(this));
    }
    return (legendUrl in this.results_);
  }
  return false;
};


/**
 * @return {boolean} True if the layer as a legend.
 * @export
 */
app.layerlegends.LayerlegendsController.prototype.isALegendAvailable = function() {

  if (this.layers != undefined && this.layers.length > 0) {
    var elem = goog.array.find(this.layers, function(layer) {
      if (this.hasLegend(layer)) {
        return true;
      }
      return false;
    }.bind(this));
    if (elem != undefined) {
      return true;
    }
  }
  return false;
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @return {*} the legend url.
 * @export
 */
app.layerlegends.LayerlegendsController.prototype.getLegendUrl = function(layer) {
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
app.layerlegends.LayerlegendsController.prototype.getImageLegendUrl = function(layer) {
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


/**
 * @return {*} the trusted legend.
 * @export
 */
app.layerlegends.LayerlegendsController.prototype.getBgLayer = function() {
  return this.backgroundLayerMgr_.get(this.map_);
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @return {*} the trusted legend.
 * @export
 */
app.layerlegends.LayerlegendsController.prototype.getLegendHtml = function(layer) {
  if (layer !== undefined && layer !== null) {
    var localMetadata = /** @type {Object.<string, string>} */
      (layer.get('metadata'));
    var legend_name = ('legend_name' in localMetadata) ?
        localMetadata['legend_name'] : '';
    var currentLanguage = this.gettextCatalog.currentLanguage;

    var legendUrl = this.getHtmlLegendUrl_ + '?lang=' +
        currentLanguage + '&name=' + legend_name;

    if (legendUrl in this.results_) {
      return this.results_[legendUrl];
    }
  }
  return '';
};

app.module.controller('AppLayerlegendsController', app.layerlegends.LayerlegendsController);
