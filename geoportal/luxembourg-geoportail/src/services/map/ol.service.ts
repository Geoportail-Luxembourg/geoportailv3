import BaseLayer from 'ol/layer/Base'
import ImageLayer from 'ol/layer/Image'
import TileLayer from 'ol/layer/Tile'
import OlMap from 'ol/Map'
import { ImageWMS, WMTS } from 'ol/source'
import { layersCache } from '../../state/layers/layers.cache'
import { Layer } from '../../state/map/map.state.model'

const proxyWmsUrl = 'https://map.geoportail.lu/ogcproxywms'
export const remoteProxyWms = 'https://map.geoportail.lu/httpsproxy'

function createWmsLayer(layer: Layer): ImageLayer<ImageWMS> {
  const { name, layers, imageType, url, id } = layer
  const olLayer = new ImageLayer({
    source: new ImageWMS({
      url: url || proxyWmsUrl,
      //hidpi: appGetDevice.isHiDpi(),
      serverType: 'mapserver',
      params: {
        FORMAT: imageType,
        LAYERS: layers,
      },
      ...((url !== undefined && url !== null) || remoteProxyWms
        ? { crossOrigin: 'anonymous' }
        : {}),
    }),
  })


  //ngeoMiscDecorate.layer(layer);
  olLayer.set('label', name)
  olLayer.set('id', id)

  return olLayer
}

export class Openlayers {
  static createLayer(spec: Layer): ImageLayer<ImageWMS> | TileLayer<WMTS> {
    let layer
    switch (spec.type) {
      case 'WMS': {
        layer = createWmsLayer(spec)
        break
      }
      default:
        throw new Error(`Unrecognized layer type: ${spec.type}`)
    }
    layer.set('metadata', spec.metadata)
    layer.set('queryable_id', spec.id)
    if (spec.metadata?.hasOwnProperty('attribution')) {
      const source = layer.getSource()
      source?.setAttributions(spec.metadata.attribution)
    }
    return layer
  }

  static addLayer(olMap: OlMap, layer: Layer, position: number) {
    const layerProps = {
      zIndex: position,
      contextLayer: layer,
    }
    const { id } = layer
    if (!layersCache.hasOwnProperty(id) || !layersCache[id]) {
      layersCache[id] = Openlayers.createLayer(layer)
    }
    olMap.addLayer(layersCache[id])
  }

  static removeLayer(olMap: OlMap, layerId: string) {
    const layerToRemove = olMap
      .getLayers()
      .getArray()
      .find(layer => layer.get('id') === layerId)
    if (layerToRemove) {
      olMap.removeLayer(layerToRemove)
    }
  }
}
