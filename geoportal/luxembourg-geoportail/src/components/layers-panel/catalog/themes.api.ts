import { ConfigModel } from '../../../services/themes/themes.model'

class ThemesApi {
  async fetchThemes(): Promise<ConfigModel> {
    return fetch('/themes?limit=30&partitionlimit=5&interface=main&cache_version=9eff71c7d5674c79a2b4a1b7a5758754&background=background')
      .then(resp => resp.json())
  }
}

export const themesApi = new ThemesApi()
