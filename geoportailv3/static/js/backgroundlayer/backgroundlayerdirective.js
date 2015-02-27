/**
 * @fileoverview This file provides the "backgroundlayer" directive. This
 * directive is used to create a dropdown for selecting the map's background
 * layer. This directive is based on Bootstrap's "dropdown" component, and
 * on the "ngeoBackgroundLayerMgr" service.
 *
 * Example:
 *
 * <app-backgroundlayer app-backgroundlayer-map="::mainCtrl.map">
 * </app-backgroundlayer>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */
goog.provide('app.backgroundlayerDirective');

goog.require('app');
goog.require('app.GetWmtsLayer');
goog.require('app.Themes');
goog.require('ngeo.BackgroundLayerMgr');


/**
 * @param {string} appBackgroundlayerTemplateUrl URL to backgroundlayer
 *     template.
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.backgroundlayerDirective = function(appBackgroundlayerTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appBackgroundlayerMap'
    },
    controller: 'AppBackgroundlayerController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appBackgroundlayerTemplateUrl
  };
};


app.module.directive('appBackgroundlayer', app.backgroundlayerDirective);



/**
 * @constructor
 * @param {ngeo.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer
 *     manager.
 * @param {app.Themes} appThemes Themes service.
 * @param {app.GetWmtsLayer} appGetWmtsLayer Get WMTS layer function.
 * @export
 * @ngInject
 */
app.BackgroundlayerController = function(ngeoBackgroundLayerMgr, appThemes,
    appGetWmtsLayer) {

  /**
   * @type {ngeo.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  /**
   * @type {app.GetWmtsLayer}
   * @private
   */
  this.getWmtsLayer_ = appGetWmtsLayer;

  /**
   * @type {ol.layer.Tile}
   * @private
   */
  this.blankLayer_ = new ol.layer.Tile();

  appThemes.getBgLayers().then(goog.bind(
      /**
       * @param {Array.<Object>} bgLayers Array of background layer objects.
       */
      function(bgLayers) {
        this['bgLayers'] = bgLayers;
        this['bgLayer'] = this['bgLayers'][0];
        this.setLayer(this['bgLayer']);
      }, this));
};


/**
 * @param {Object} layerSpec Layer specificacion object.
 * @export
 */
app.BackgroundlayerController.prototype.setLayer = function(layerSpec) {
  this['bgLayer'] = layerSpec;
  var layerName = layerSpec['name'];
  var layer = layerName === 'blank' ?
      this.blankLayer_ : this.getWmtsLayer_(layerName);
  this.backgroundLayerMgr_.set(this['map'], layer);
};


app.module.controller('AppBackgroundlayerController',
    app.BackgroundlayerController);
