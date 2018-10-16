/**
 * @fileoverview This file defines Angular services to use to get OpenLayers
 * layers for the application.
 */
goog.provide('app.GetWmsLayer');

goog.require('app.module');
goog.require('app.olcs.Extent');
goog.require('ngeo.misc.decorate');
goog.require('ol.layer.Image');
goog.require('ol.source.ImageWMS');


/**
 * @typedef {function(string, string, string, string=):ol.layer.Image}
 */
app.GetWmsLayer;


/**
 * @param {string} proxyWmsUrl URL to the proxy wms.
 * @param {boolean} remoteProxyWms is the proxy wms remote or local.
 * @param {app.GetDevice} appGetDevice The device service.
 * @return {app.GetWmsLayer} The getWmsLayer function.
 * @private
 * @ngInject
 */
app.getWmsLayer_ = function(proxyWmsUrl, remoteProxyWms,
    appGetDevice) {
  return getWmsLayer;

  /**
   * @param {string} name WMS layer name.
   * @param {string} layers Comma-separated list of layer names for that WMS
   *     layer.
   * @param {string} imageType Image type (e.g. "image/png").
   * @param {string=} opt_url WMS URL.
   * @return {ol.layer.Image} The layer.
   */
  function getWmsLayer(name, layers, imageType, opt_url) {
    var url = goog.isDef(opt_url) ?
        opt_url : proxyWmsUrl;
    var optSource = {
      url: url,
      hidpi: appGetDevice.isHiDpi(),
      serverType: 'mapserver',
      params: {
        'FORMAT': imageType,
        'LAYERS': layers
      }
    };

    if (goog.isDef(opt_url) || remoteProxyWms) {
      optSource.crossOrigin = 'anonymous';
    }
    var layer = new ol.layer.Image({
      'olcs.extent': app.olcs.Extent,
      source: new ol.source.ImageWMS(optSource)
    });

    layer.set('label', name);
    ngeo.misc.decorate.layer(layer);

    return layer;
  }
};


app.module.factory('appGetWmsLayer', app.getWmsLayer_);
