export const translations = {
  en: {
    poweredBy: "Powered by",
    description: "Clicking below will copy this page and open it in the app.",
    openInApp: "Open in the app",
    openInAppWithoutCopying: "Open in the app without copying",
  },
  zh: {
    poweredBy: "由",
    description: "点击下方将复制此页面并在应用中打开。",
    openInApp: "在应用中打开",
    openInAppWithoutCopying: "在应用中打开（不复制）",
  },
  es: {
    poweredBy: "Desarrollado por",
    description:
      "Al hacer clic a continuación, se copiará esta página y se abrirá en la aplicación.",
    openInApp: "Abrir en la aplicación",
    openInAppWithoutCopying: "Abrir en la aplicación sin copiar",
  },
  fr: {
    poweredBy: "Propulsé par",
    description:
      "En cliquant ci-dessous, cette page sera copiée et ouverte dans l'application.",
    openInApp: "Ouvrir dans l'application",
    openInAppWithoutCopying: "Ouvrir dans l'application sans copier",
  },
  tr: {
    poweredBy: "tarafından desteklenmektedir",
    poweredByOrder: "inverted",
    description: "Linki uygulamada açmak için aşağıdaki butona tıklayın.",
    openInApp: "Uygulamada aç",
    openInAppWithoutCopying: "Kopyalamadan uygulamada aç",
  },
} as const;

export type Language = keyof typeof translations;

export function getLanguage(acceptLanguage?: string | null): Language {
  if (!acceptLanguage) return "en";

  const languages = acceptLanguage
    .toLowerCase()
    .split(",")
    .map((lang) => {
      const [code] = lang.trim().split(";");
      return code.split("-")[0]; // Extract base language code (e.g., "en" from "en-US")
    });

  // Check for supported languages in order of preference
  for (const lang of languages) {
    if (lang in translations) {
      return lang as Language;
    }
  }

  // Default to English if no match found
  return "en";
}

export function getTranslations(language: Language) {
  return translations[language];
}
