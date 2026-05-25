export const translations = {
  en: {
    poweredBy: "Powered by",
    description: "Click below to open the page in {appName}.",
    openInApp: "Open in the app",
  },
  zh: {
    poweredBy: "由",
    description: "点击下方在 {appName} 中打开页面。",
    openInApp: "在应用中打开",
  },
  es: {
    poweredBy: "Desarrollado por",
    description: "Haz clic abajo para abrir la página en {appName}.",
    openInApp: "Abrir en la aplicación",
  },
  fr: {
    poweredBy: "Propulsé par",
    description: "Cliquez ci-dessous pour ouvrir la page dans {appName}.",
    openInApp: "Ouvrir dans l'application",
  },
  it: {
    poweredBy: "Offerto da",
    description: "Clicca qui sotto per aprire la pagina in {appName}.",
    openInApp: "Apri nell'app",
  },
  pt: {
    poweredBy: "Desenvolvido por",
    description: "Clique abaixo para abrir a página no {appName}.",
    openInApp: "Abrir no aplicativo",
  },
  de: {
    poweredBy: "Bereitgestellt von",
    description: "Klicke unten, um die Seite in {appName} zu öffnen.",
    openInApp: "In der App öffnen",
  },
  tr: {
    poweredBy: "tarafından desteklenmektedir",
    poweredByOrder: "inverted",
    description: "Sayfayı {appName} içinde açmak için aşağıya tıklayın.",
    openInApp: "Uygulamada aç",
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
