import i18next from 'i18next'
import backend from 'i18next-http-backend'
import { LitElement } from 'lit'

type Constructor<T = {}> = new (...args: any[]) => T

export declare class i18nMixinInterface {
  protected changeLanguage(lang: string): void
}

export const i18nMixin = <T extends Constructor<LitElement>>(superClass: T) => {
  class i18nMixinClass extends superClass {
    firstUpdated() {
      i18next.on('initialized', options => {
        this.requestUpdate()
      })
      i18next.on('languageChanged', options => {
        this.requestUpdate()
      })
      if (!i18next.isInitialized) {
        i18next.use(backend)
        i18next.init({
          lng: 'fr',
          debug: false,
          defaultNS: 'client',
          supportedLngs: ['de', 'en', 'fr', 'lb'],
          ns: ['client', 'legends', 'server', 'tooltips'],
          fallbackLng: 'fr',
          backend: {
            loadPath: '/assets/locales/{{ns}}.{{lng}}.json',
          },
        })
      }
      super.firstUpdated
    }

    changeLanguage(lang: string): void {
      i18next.changeLanguage(lang)
    }
  }
  return i18nMixinClass as unknown as Constructor<i18nMixinInterface> & T
}
