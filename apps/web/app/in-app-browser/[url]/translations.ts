export const translations = {
  en: {
    poweredBy: "Powered by",
    description: "Click below to continue to {storeName}.",
    manualEscapeDescription:
      "Copy the link, then open it in your browser to continue to {storeName}.",
    openInStore: "Open in {storeName}",
    copyLink: "Copy link",
    copied: "Copied",
    copyFailed: "Couldn't copy — select the link below",
  },
  zh: {
    poweredBy: "由",
    description: "点击下方继续前往{storeName}。",
    manualEscapeDescription: "请复制链接，然后在浏览器中打开以继续前往{storeName}。",
    openInStore: "在{storeName}中打开",
    copyLink: "复制链接",
    copied: "已复制",
    copyFailed: "无法复制 — 请选择下方链接",
  },
  es: {
    poweredBy: "Desarrollado por",
    description: "Haz clic abajo para continuar a {storeName}.",
    manualEscapeDescription:
      "Copia el enlace y ábrelo en tu navegador para continuar a {storeName}.",
    openInStore: "Abrir en {storeName}",
    copyLink: "Copiar enlace",
    copied: "Copiado",
    copyFailed: "No se pudo copiar — selecciona el enlace abajo",
  },
  fr: {
    poweredBy: "Propulsé par",
    description: "Cliquez ci-dessous pour continuer vers {storeName}.",
    manualEscapeDescription:
      "Copiez le lien, puis ouvrez-le dans votre navigateur pour continuer vers {storeName}.",
    openInStore: "Ouvrir dans {storeName}",
    copyLink: "Copier le lien",
    copied: "Copié",
    copyFailed: "Impossible de copier — sélectionnez le lien ci-dessous",
  },
  it: {
    poweredBy: "Offerto da",
    description: "Clicca qui sotto per continuare su {storeName}.",
    manualEscapeDescription:
      "Copia il link e aprilo nel browser per continuare su {storeName}.",
    openInStore: "Apri in {storeName}",
    copyLink: "Copia link",
    copied: "Copiato",
    copyFailed: "Impossibile copiare — seleziona il link qui sotto",
  },
  pt: {
    poweredBy: "Desenvolvido por",
    description: "Clique abaixo para continuar em {storeName}.",
    manualEscapeDescription:
      "Copie o link e abra no navegador para continuar em {storeName}.",
    openInStore: "Abrir em {storeName}",
    copyLink: "Copiar link",
    copied: "Copiado",
    copyFailed: "Não foi possível copiar — selecione o link abaixo",
  },
  de: {
    poweredBy: "Bereitgestellt von",
    description: "Klicke unten, um zu {storeName} zu gelangen.",
    manualEscapeDescription:
      "Kopiere den Link und öffne ihn im Browser, um zu {storeName} zu gelangen.",
    openInStore: "In {storeName} öffnen",
    copyLink: "Link kopieren",
    copied: "Kopiert",
    copyFailed: "Kopieren fehlgeschlagen — Link unten auswählen",
  },
  tr: {
    poweredBy: "tarafından desteklenmektedir",
    poweredByOrder: "inverted",
    description: "{storeName} için aşağıya tıklayın.",
    manualEscapeDescription:
      "Bağlantıyı kopyalayıp tarayıcınızda açarak {storeName} ile devam edin.",
    openInStore: "{storeName} içinde aç",
    copyLink: "Bağlantıyı kopyala",
    copied: "Kopyalandı",
    copyFailed: "Kopyalanamadı — aşağıdaki bağlantıyı seçin",
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
