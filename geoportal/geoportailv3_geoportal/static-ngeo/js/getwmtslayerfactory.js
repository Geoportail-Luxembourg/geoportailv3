/**
 * @module app.GetWmtsLayerFactory
 */
let exports = {};

/**
 * @fileoverview This file defines Angular services to use to get OpenLayers
 * layers for the application.
 */

import appModule from './module.js';
import appOlcsExtent from './olcs/Extent.js';
import ngeoMiscDecorate from 'ngeo/misc/decorate.js';
import olExtent from 'ol/extent.js';
import olProj from 'ol/proj.js';
import olLayerTile from 'ol/layer/Tile.js';
import olSourceWMTS from 'ol/source/WMTS.js';
import olSourceWMTSRequestEncoding from 'ol/source/WMTSRequestEncoding.js';
import olTilegridWMTS from 'ol/tilegrid/WMTS.js';


/**
 * @param {string} imageType Image type (e.g. "image/png").
 * @return {string} Image extensino (e.g. "png").
 * @private
 */
function getImageExtension_(imageType) {
  console.assert(imageType.indexOf('/'));
  var imageExt = imageType.split('/')[1];
  console.assert(imageExt == 'png' || imageExt == 'jpeg');
  return imageExt;
}


/**
 * @param {string} requestScheme The scheme.
 * @return {app.GetWmtsLayer} The getWmtsLayer function.
 * @private
 * @ngInject
 */
function factory(requestScheme) {
  return getWmtsLayer;

  /**
   * @param {string} name WMTS layer name.
   * @param {string} imageType Image type (e.g. "image/png").
   * @param {boolean} retina If there is a retina layer.
   * @return {ol.layer.Tile} The layer.
   */
  function getWmtsLayer(name, imageType, retina) {

    var imageExt = getImageExtension_(imageType);
    var retinaExtension = (retina ? '_hd' : '');
    var url = '//wmts{1-2}.geoportail.lu/mapproxy_4_v3/wmts/{Layer}' +
        retinaExtension +
        '/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.' + imageExt;

    if (requestScheme === 'https') {
      url = '//wmts{3-4}.geoportail.lu/mapproxy_4_v3/wmts/{Layer}' +
          retinaExtension +
          '/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.' + imageExt;
    }
    var projection = olProj.get('EPSG:3857');
    var extent = projection.getExtent();
    var layer = new olLayerTile({
      'olcs.extent': appOlcsExtent,
      source: new olSourceWMTS({
        url: url,
        tilePixelRatio: (retina ? 2 : 1),
        layer: name,
        matrixSet: 'GLOBAL_WEBMERCATOR_4_V3' + (retina ? '_HD' : ''),
        format: imageType,
        requestEncoding: olSourceWMTSRequestEncoding.REST,
        projection: projection,
        tileGrid: new olTilegridWMTS({
          origin: olExtent.getTopLeft(extent),
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
    ngeoMiscDecorate.layer(layer);

    return layer;
  }
}


appModule.factory('appGetWmtsLayer', factory);


export default exports;
