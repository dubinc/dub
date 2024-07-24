const supportedDeeplinkProtocols = [
  "mailto:",
  "tel:",
  "sms:",
  "whatsapp:",
  "tg:",
];

export const isSupportedDeeplinkProtocol = (url: string) => {
  return supportedDeeplinkProtocols.some((protocol) =>
    url.startsWith(protocol),
  );
};
