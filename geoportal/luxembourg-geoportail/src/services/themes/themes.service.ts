import { BehaviorSubject, combineLatest, filter, from, map, tap } from 'rxjs'
import { themesApi } from '../../components/layers-panel/catalog/themes.api'
import { ThemeNodeModel } from './themes.model'

export class ThemesService {
  private theme: ThemeNodeModel

  config$ = from(themesApi.fetchThemes())
  themes$ = this.config$.pipe(map(config => config?.themes))
  themeName$ = new BehaviorSubject('main')
  theme$ = combineLatest([this.themes$, this.themeName$]).pipe(
    map(([themes, themeName]) =>
      themes.find(theme => theme.name === themeName)
    ),
    filter(theme => !!theme),
    tap(theme => (this.theme = theme as ThemeNodeModel))
  )

  findById(id: number, node?: ThemeNodeModel): ThemeNodeModel | undefined {
    node = node || this.theme
    if (node.id === id) {
      return node
    } else if (node.children) {
      for (const child of node.children) {
        const match = this.findById(id, child)
        if (match) {
          return match
        }
      }
    }
  }

  setTheme(name: string) {
    this.themeName$.next(name)
  }
}

export const themesService = new ThemesService()
