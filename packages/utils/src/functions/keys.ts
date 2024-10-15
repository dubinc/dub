// allow letters, numbers, '-', '_', '/', '.', and emojis
export const validKeyRegex = new RegExp(
  /^[0-9A-Za-z_\u0080-\uFFFF\/\-\p{Emoji}.]+$/u,
);

export const isUnsupportedKey = (key: string) => {
  const unsupportedExtensions = [".php", ".php7"];
  return unsupportedExtensions.some((extension) => key.endsWith(extension));
};
