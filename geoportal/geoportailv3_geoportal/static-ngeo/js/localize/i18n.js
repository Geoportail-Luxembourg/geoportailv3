import i18next from 'i18next';
import XhrBackend from 'i18next-xhr-backend';


export function setupI18n() {
    i18next
    .use(XhrBackend)
    .init({
        ns: 'app',
        nonExplicitWhitelist: true,
        returnEmptyString: false,
        fallbackLng: 'en',
        debug: false,
        backend: {
          loadPath: '/static-ngeo/locales/{{ns}}.{{lng}}.json'
        }
    });
}
