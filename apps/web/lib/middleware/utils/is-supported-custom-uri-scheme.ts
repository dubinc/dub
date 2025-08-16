const supportedCustomURISchemes = [
  "mailto:",
  "sms:",
  "tel:",
  "tg:",
  "whatsapp:",
  "xmpp:",
];

export const isSupportedCustomURIScheme = (url: string) => {
  return supportedCustomURISchemes.some((protocol) => url.startsWith(protocol));
};
