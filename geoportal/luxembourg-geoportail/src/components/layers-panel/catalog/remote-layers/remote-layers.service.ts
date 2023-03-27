import { WmsEndpoint } from '@camptocamp/ogc-client'
import { predefinedWmsFixture } from '../../../../../test/fixtures/predefined-wms.fixture'
import { remoteProxyWms } from '../../../../services/map/ol.service'
import {
  OgcClientWmsEndpoint,
  RemoteWmsEndpointModel,
} from './remote-layers.model'

const forceUseProxy = true

export class RemoteLayersService {
  public getWmsEndpoint(url: string): OgcClientWmsEndpoint {
    return new WmsEndpoint(this.getProxyfiedUrl(url))
  }

  public getProxyfiedUrl(url: string) {
    if (url.indexOf('httpsproxy') > 0) {
      return url
    }

    if (
      forceUseProxy ||
      (window.location.protocol === 'https:' &&
        url.toLowerCase().indexOf('http:') === 0)
    ) {
      return remoteProxyWms + '?url=' + encodeURIComponent(url)
    }

    return url
  }

  async fetchRemoteWmsEndpoint(): Promise<RemoteWmsEndpointModel[]> {
    return new Promise(resolve => resolve(predefinedWmsFixture()))
  }
}

export const remoteLayersService = new RemoteLayersService()
