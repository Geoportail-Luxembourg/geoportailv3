/**
 * @module app.GetWmsLayerFactory
 */
let exports = {};

/**
 * @fileoverview This file defines Angular services to use to get OpenLayers
 * layers for the application.
 */

import appModule from './module.js';
import appOlcsExtent from './olcs/Extent.js';
import ngeoMiscDecorate from 'ngeo/misc/decorate.js';
import olLayerImage from 'ol/layer/Image.js';
import olSourceImageWMS from 'ol/source/ImageWMS.js';


/**
 * @param {string} proxyWmsUrl URL to the proxy wms.
 * @param {boolean} remoteProxyWms is the proxy wms remote or local.
 * @param {app.GetDevice} appGetDevice The device service.
 * @return {app.GetWmsLayer} The getWmsLayer function.
 * @private
 * @ngInject
 */
function factory(proxyWmsUrl, remoteProxyWms,
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
    var url = opt_url !== undefined ?
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

    if (opt_url !== undefined || remoteProxyWms) {
      optSource.crossOrigin = 'anonymous';
    }
    var layer = new olLayerImage({
      'olcs.extent': appOlcsExtent,
      source: new olSourceImageWMS(optSource)
    });

    layer.set('label', name);
    ngeoMiscDecorate.layer(layer);

    return layer;
  }
}


appModule.factory('appGetWmsLayer', factory);


export default exports;
