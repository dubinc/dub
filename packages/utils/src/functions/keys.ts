// allow letters, numbers, '-', '_', '/', '.', and broad Unicode (accents, emoji, international scripts)
// Dub domains strip accents/diacriticals for security; custom domains preserve Unicode
export const validKeyRegex = /^[0-9A-Za-z_\u0080-\uFFFF/.\-]+$/u;

export const isUnsupportedKey = (key: string) => {
  // special case for root domain links
  if (key === "_root") {
    return false;
  }
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
