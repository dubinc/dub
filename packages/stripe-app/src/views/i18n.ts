import type { Resource } from "i18next";
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

void i18n
  .use({
    type: "backend",
    read(
      language: string,
      namespace: string,
      callback: (errorValue: unknown, translations: null | Resource) => void,
    ) {
      import(`./${namespace}/locales/${language}.json`)
        .then((resources) => {
          callback(null, resources as unknown as Resource);
        })
        .catch((error) => {
          callback(error, null);
        });
    },
  })
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: true,

    interpolation: {
      escapeValue: false,
    },

    // react i18next special options (optional)
    // override if needed - omit if ok with defaults
    /*
    react: {
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
      useSuspense: true,
    }
    */
  });

export { i18n };
