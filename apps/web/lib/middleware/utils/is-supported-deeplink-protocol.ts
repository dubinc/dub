export const isSupportedDeeplinkProtocol = (url: string) => {
  return url.startsWith("mailto:") || url.startsWith("tel:");
};
