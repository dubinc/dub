export const translations = {
  en: {
    passwordRequired: "Password required",
    description:
      "This link is password protected. Enter the password to view it.",
    whatIsDub: "What is Dub?",
    passwordLabel: "Password",
    incorrectPassword: "Incorrect password",
    viewPage: "View page",
  },
  zh: {
    passwordRequired: "需要密码",
    description: "此链接受密码保护。请输入密码以查看。",
    whatIsDub: "什么是 Dub？",
    passwordLabel: "密码",
    incorrectPassword: "密码错误",
    viewPage: "查看页面",
  },
  es: {
    passwordRequired: "Contraseña requerida",
    description:
      "Este enlace está protegido con contraseña. Ingresa la contraseña para verlo.",
    whatIsDub: "¿Qué es Dub?",
    passwordLabel: "Contraseña",
    incorrectPassword: "Contraseña incorrecta",
    viewPage: "Ver página",
  },
  fr: {
    passwordRequired: "Mot de passe requis",
    description:
      "Ce lien est protégé par un mot de passe. Entrez le mot de passe pour y accéder.",
    whatIsDub: "Qu'est-ce que Dub ?",
    passwordLabel: "Mot de passe",
    incorrectPassword: "Mot de passe incorrect",
    viewPage: "Voir la page",
  },
  tr: {
    passwordRequired: "Şifre gerekli",
    description:
      "Bu bağlantı şifre korumalıdır. Görüntülemek için şifreyi girin.",
    whatIsDub: "Dub nedir?",
    passwordLabel: "Şifre",
    incorrectPassword: "Yanlış şifre",
    viewPage: "Sayfayı görüntüle",
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
