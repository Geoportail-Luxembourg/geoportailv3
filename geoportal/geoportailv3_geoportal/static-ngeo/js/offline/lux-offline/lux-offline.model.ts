export enum OfflineStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  UPDATE_AVAILABLE = 'UPDATE_AVAILABLE',
  UP_TO_DATE = 'UP_TO_DATE',
  UNINITIALIZED = 'NO_INIT'
}
export interface TilePackages {
  ALL: string[],
  IN_PROGRESS: string[],
  UPDATE_AVAILABLE: string[],
  UP_TO_DATE: string[]
};
export enum PackageToSkip {
  HILLSHADE = "hillshade-lu"
}
export interface StatusJson {
  'countours-lu': TileStatus,
  'fonts': TileStatus,
  'hillshade-lu': TileStatus,
  'omt-geoportail-lu': TileStatus,
  'omt-topo-geoportail-lu': TileStatus,
  'resources': TileStatus,
  'sprites': TileStatus
}
interface TileStatus {
  status: string,
  filesize: string,
  current: string,
  available: string
}
