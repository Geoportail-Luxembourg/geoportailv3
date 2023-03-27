export interface ConfigModel {
  ogcServers: {}
  themes: ThemeNodeModel[]
  background_layers: ThemeNodeModel[]
  errors: []
  lux_3d: {}
}

export type Metadata = Partial<{
  is_queryable: boolean
  is_expanded: boolean
  display_in_switcher: boolean
  show_in_mobile: boolean
  start_opacity: number
  bg_opacity: number
  max_dpi: number
  metadata_id: string
  attribution: string
  legend_name: string
  exclusion: string
  css: string
  bg_layer: string
  linked_layers: string[]
  link_title: string
  page_title: string
  print_img: string
  print_long_txt_de: string
  print_long_txt_en: string
  print_long_txt_fr: string
  print_long_txt_lu: string
  print_short_txt_de: string
  print_short_txt_en: string
  print_short_txt_fr: string
  print_short_txt_lu: string
  print_scales: string[]
  fake_scales: string[]
  resolutions: string[]
  start_layers: string[]
  start_x: number
  start_y: number
  start_zoom: number
  ol3d_defaultlayer: boolean
  ol3d_options: {
    heightOffset: number
  }

  ol3d_type: string
  ogc_info_format: string
  ogc_info_srs: string
  ogc_query_layers: string[]
  hasRetina: boolean
}>
export type LayerType = 'WMS' | 'WFS' | 'WMTS'

export interface ThemeNodeModel {
  id: number
  name: string
  icon?: string
  layers?: string
  url?: string
  ogcServer?: string
  type?: LayerType
  imageType?: string
  metadata?: Metadata
  dimensions?: {}
  style?: string
  matrixSet?: string
  layer?: string
  children?: ThemeNodeModel[]
  mixed?: boolean
  childLayers?: {
    name: string
  }[]
  functionalities?: {}
}
