import RasterSynchronizer from 'olcs/RasterSynchronizer';
import MapBoxLayer from '@geoblocks/mapboxlayer/src/MapBoxLayer.js';
import {MapLibreLayer} from "luxembourg-geoportail/bundle/lux.dist.js";
import {XYZ} from 'ol/source';
import {Tile as TileLayer} from 'ol/layer';

export default class LuxRasterSynchronizer extends RasterSynchronizer {

  /**
   * @override
   */
  convertLayerToCesiumImageries(olLayer, viewProj) {
    if (olLayer instanceof MapBoxLayer || olLayer instanceof MapLibreLayer) {
      const url = olLayer.get('xyz_custom') || olLayer.getXYZ();
      console.log(url);
      olLayer = new TileLayer({
        source: new XYZ({
          url
        })
      });
    }
    return super.convertLayerToCesiumImageries(olLayer, viewProj);
  }
}
