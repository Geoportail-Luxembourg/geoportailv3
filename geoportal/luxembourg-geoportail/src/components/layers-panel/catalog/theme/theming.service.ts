import { ThemeNodeModel } from '../../../../services/themes/themes.model'

export class ThemingService {
  setCurrentThemeColors(theme: ThemeNodeModel) {
    const root = document.querySelector(':root') as HTMLElement
    const colors = ['primary', 'secondary', 'tertiary']
    colors.forEach(colorTone => {
      const color = getComputedStyle(root).getPropertyValue(
        `--${theme.name}-${colorTone}`
      )
      root.style.setProperty(`--color-${colorTone}`, color)
    })
  }
}

export const themingService = new ThemingService()
