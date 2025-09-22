export const isValidHex = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

export const isWhiteHex = (color: string): boolean => {
  const normalizedColor = color.toLowerCase();
  return normalizedColor === "#ffffff" || normalizedColor === "#fff";
};