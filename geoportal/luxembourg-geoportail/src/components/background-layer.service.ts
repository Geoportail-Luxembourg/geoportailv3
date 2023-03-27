import { BehaviorSubject } from 'rxjs'

export interface LuxBgLayer {
  name: string
}

export class BgLayerService {
  bgLayers: LuxBgLayer[] = [
    {
      name: 'route',
    },
    {
      name: 'topo',
    },
    {
      name: 'topo_bw',
    },
    {
      name: 'ortho',
    },
    {
      name: 'hybrid',
    },
    {
      name: 'white',
    },
  ]
  bgLayers$ = new BehaviorSubject<LuxBgLayer[]>(this.bgLayers)
  activeBgLayer$ = new BehaviorSubject<LuxBgLayer>(this.bgLayers[0])

  constructor() {}

  setBgLayer(bgLayer: LuxBgLayer) {
    this.activeBgLayer$.next(bgLayer)
  }
}

export const bgLayerService = new BgLayerService()
