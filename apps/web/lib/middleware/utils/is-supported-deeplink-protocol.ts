const supportedDeeplinkProtocols = [
  "mailto:",
  "sms:",
  "tel:",
  "tg:",
  "whatsapp:",
  "xmpp:",
];

export const isSupportedDeeplinkProtocol = (url: string) => {
  return supportedDeeplinkProtocols.some((protocol) =>
    url.startsWith(protocol),
  );
};
