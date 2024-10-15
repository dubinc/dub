// allow letters, numbers, '-', '_', '/', '.', and emojis
export const validKeyRegex = new RegExp(
  /^[0-9A-Za-z_\u0080-\uFFFF\/\-\p{Emoji}.]+$/u,
);

export const isUnsupportedKey = (key: string) => {
  const excludedPrefix = [".well-known"];
  const excludedSuffix = [".php", ".php7"];
  return (
    excludedPrefix.some((prefix) => key.startsWith(prefix)) ||
    excludedSuffix.some((suffix) => key.endsWith(suffix))
  );
};

export const isReservedKeyGlobal = (key: string) => {
  const reservedKeys = [
    "favicon.ico",
    "sitemap.xml",
    "robots.txt",
    "manifest.webmanifest",
    "manifest.json",
    "apple-app-site-association",
  ];
  return reservedKeys.includes(key);
};
