/**
 * @fileoverview This file defines Angular services to use to get OpenLayers
 * layers for the application.
 */
goog.provide('app.GetWmtsLayer');

goog.require('app.module');
goog.require('app.olcs.Extent');
goog.require('goog.asserts');
goog.require('ngeo.misc.decorate');
goog.require('ol.extent');
goog.require('ol.proj');
goog.require('ol.layer.Tile');
goog.require('ol.source.WMTS');
goog.require('ol.source.WMTSRequestEncoding');
goog.require('ol.tilegrid.WMTS');


/**
 * @typedef {function(string, string, boolean):ol.layer.Tile}
 */
app.GetWmtsLayer;

/**
 * @const
 * @type {Object.<string, ol.layer.Layer>}
 * @private
 */
app.layerCache_ = {};


/**
 * @param {string} imageType Image type (e.g. "image/png").
 * @return {string} Image extensino (e.g. "png").
 * @private
 */
app.getImageExtension_ = function(imageType) {
  goog.asserts.assert(imageType.indexOf('/'));
  var imageExt = imageType.split('/')[1];
  goog.asserts.assert(imageExt == 'png' || imageExt == 'jpeg');
  return imageExt;
};


/**
 * @param {string} requestScheme The scheme.
 * @return {app.GetWmtsLayer} The getWmtsLayer function.
 * @private
 * @ngInject
 */
app.getWmtsLayer_ = function(requestScheme) {
  return getWmtsLayer;

  /**
   * @param {string} name WMTS layer name.
   * @param {string} imageType Image type (e.g. "image/png").
   * @param {boolean} retina If there is a retina layer.
   * @return {ol.layer.Tile} The layer.
   */
  function getWmtsLayer(name, imageType, retina) {

    var imageExt = app.getImageExtension_(imageType);
    var retinaExtension = (retina ? '_hd' : '');
    var url = '//wmts{1-2}.geoportail.lu/mapproxy_4_v3/wmts/{Layer}' +
        retinaExtension +
        '/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.' + imageExt;

    if (requestScheme === 'https') {
      url = '//wmts{3-4}.geoportail.lu/mapproxy_4_v3/wmts/{Layer}' +
          retinaExtension +
          '/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.' + imageExt;
    }
    var projection = ol.proj.get('EPSG:3857');
    var extent = projection.getExtent();
    var layer = new ol.layer.Tile({
      'olcs.extent': app.olcs.Extent,
      source: new ol.source.WMTS({
        url: url,
        tilePixelRatio: (retina ? 2 : 1),
        layer: name,
        matrixSet: 'GLOBAL_WEBMERCATOR_4_V3' + (retina ? '_HD' : ''),
        format: imageType,
        requestEncoding: ol.source.WMTSRequestEncoding.REST,
        projection: projection,
        tileGrid: new ol.tilegrid.WMTS({
          origin: ol.extent.getTopLeft(extent),
          extent: extent,
          resolutions: [156543.033928, 78271.516964,
            39135.758482, 19567.879241, 9783.9396205,
            4891.96981025, 2445.98490513, 1222.99245256,
            611.496226281, 305.748113141, 152.87405657,
            76.4370282852, 38.2185141426, 19.1092570713,
            9.55462853565, 4.77731426782, 2.38865713391,
            1.19432856696, 0.597164283478, 0.298582141739,
            0.1492910708695, 0.07464553543475],
          matrixIds: [
            '00', '01', '02', '03', '04', '05', '06', '07', '08', '09',
            '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
            '21'
          ]
        }),
        style: 'default',
        crossOrigin: 'anonymous'
      })
    });

    layer.set('label', name);
    ngeo.misc.decorate.layer(layer);

    return layer;
  }
};


app.module.factory('appGetWmtsLayer', app.getWmtsLayer_);
