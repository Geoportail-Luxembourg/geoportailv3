import RasterSynchronizer from 'olcs/RasterSynchronizer';
import MapBoxLayer from '@geoblocks/mapboxlayer-legacy';
import {XYZ} from 'ol/source';
import {Tile as TileLayer} from 'ol/layer';

export default class LuxRasterSynchronizer extends RasterSynchronizer {

  /**
   * @override
   */
  convertLayerToCesiumImageries(olLayer, viewProj) {

    if (olLayer instanceof MapBoxLayer) {
      const url = olLayer.get('xyz_custom') || olLayer.getXYZ();
      olLayer = new TileLayer({
        source: new XYZ({
          url
        })
      });
    }
    return super.convertLayerToCesiumImageries(olLayer, viewProj);
  }
}
