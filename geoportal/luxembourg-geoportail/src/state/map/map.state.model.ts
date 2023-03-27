import { LayerType, Metadata } from '../../services/themes/themes.model'

export enum LayerImageType {
  PNG = 'image/png',
  JPG = 'image/jpeg',
}

export interface Layer {
  id: number | string
  name: string
  layers: string
  url?: string
  type: LayerType
  imageType: string
  metadata?: Metadata
  dimensions?: {}
  style?: string
}

export interface MapContext {
  layers?: Layer[]
}

export interface LayerComparison {
  layer: Layer
  position: number
}
