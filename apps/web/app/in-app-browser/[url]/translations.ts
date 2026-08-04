export const translations = {
  en: {
    poweredBy: "Powered by",
    description: "Click below to continue to {storeName}.",
    openInStore: "Open in {storeName}",
    copyLink: "Copy link",
    copied: "Copied",
  },
  zh: {
    poweredBy: "由",
    description: "点击下方继续前往{storeName}。",
    openInStore: "在{storeName}中打开",
    copyLink: "复制链接",
    copied: "已复制",
  },
  es: {
    poweredBy: "Desarrollado por",
    description: "Haz clic abajo para continuar a {storeName}.",
    openInStore: "Abrir en {storeName}",
    copyLink: "Copiar enlace",
    copied: "Copiado",
  },
  fr: {
    poweredBy: "Propulsé par",
    description: "Cliquez ci-dessous pour continuer vers le {storeName}.",
    openInStore: "Ouvrir dans le {storeName}",
    copyLink: "Copier le lien",
    copied: "Copié",
  },
  it: {
    poweredBy: "Offerto da",
    description: "Clicca qui sotto per continuare su {storeName}.",
    openInStore: "Apri in {storeName}",
    copyLink: "Copia link",
    copied: "Copiato",
  },
  pt: {
    poweredBy: "Desenvolvido por",
    description: "Clique abaixo para continuar na {storeName}.",
    openInStore: "Abrir na {storeName}",
    copyLink: "Copiar link",
    copied: "Copiado",
  },
  de: {
    poweredBy: "Bereitgestellt von",
    description: "Klicke unten, um zum {storeName} zu gelangen.",
    openInStore: "Im {storeName} öffnen",
    copyLink: "Link kopieren",
    copied: "Kopiert",
  },
  tr: {
    poweredBy: "tarafından desteklenmektedir",
    poweredByOrder: "inverted",
    description: "{storeName} için aşağıya tıklayın.",
    openInStore: "{storeName}'da aç",
    copyLink: "Bağlantıyı kopyala",
    copied: "Kopyalandı",
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
      return code.split("-")[0];
    });

  for (const lang of languages) {
    if (lang in translations) {
      return lang as Language;
    }
  }

  return "en";
}

export function getTranslations(language: Language) {
  return translations[language];
}
