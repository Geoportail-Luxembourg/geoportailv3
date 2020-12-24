/**
 * @module app.layerlegends.LayerlegendsController
 */
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

import appModule from '../module.js';

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
const exports = function($http, $sce, $window, gettextCatalog,
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
  this.$window_ = $window;

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
exports.prototype.buildLegendUrl = function(layer) {
    var localMetadata = /** @type {Object.<string, string>} */
        (layer.get('metadata'));

    var currentLanguage = this.gettextCatalog.currentLanguage;
      var queryParams = {'lang': currentLanguage};

    if (localMetadata != undefined && 'legend_name' in localMetadata) {
        queryParams['name'] = localMetadata['legend_name']
    }
    var id = layer.get('queryable_id');
    if (id != undefined) {
        queryParams['id'] = id;
    }
    // handle high resolution screens
    if (this.$window_.devicePixelRatio > 1) {
      queryParams['dpi'] = this.$window_.devicePixelRatio*96;
    }
    return this.getHtmlLegendUrl_ + '?' + (new URLSearchParams(queryParams)).toString();
}

exports.prototype.hasLegend = function(layer) {
  if (layer !== undefined && layer !== null) {
    var legendUrl = this.buildLegendUrl(layer);
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
exports.prototype.isALegendAvailable = function() {

  if (this.layers != undefined && this.layers.length > 0) {
    var elem = this.layers.find(function(layer) {
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
exports.prototype.getLegendUrl = function(layer) {
  var localMetadata = /** @type {Object.<string, string>} */
    (layer.get('metadata'));
  var legend_name = ('legend_name' in localMetadata) ?
      localMetadata['legend_name'] : '';
  var currentLanguage = this.gettextCatalog.currentLanguage;
    const isIpv6 = location.search.includes('ipv6=true');
    const domain = (isIpv6) ? "app.geoportail.lu" : "geoportail.lu";

  return this.sce_.trustAsResourceUrl(
      '//wiki.' + domain +'/doku.php?id=' +
      currentLanguage + ':legend:' +
      legend_name + '&do=export_html'
  );
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @return {*} the legend url.
 * @export
 */
exports.prototype.getImageLegendUrl = function(layer) {
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
exports.prototype.getBgLayer = function() {
  return this.backgroundLayerMgr_.get(this.map_);
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @return {*} the trusted legend.
 * @export
 */
exports.prototype.getLegendHtml = function(layer) {
  if (layer !== undefined && layer !== null) {
    var legendUrl = this.buildLegendUrl(layer);
    if (legendUrl in this.results_) {
      return this.results_[legendUrl];
    }
  }
  return '';
};

appModule.controller('AppLayerlegendsController', exports);


export default exports;
