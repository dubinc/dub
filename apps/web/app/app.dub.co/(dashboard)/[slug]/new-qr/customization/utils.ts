import { SHORT_WHITE_COLOR, WHITE_COLOR } from "./constants/colors.ts";

export const convertSvgUrlToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const svgText = await response.text();
  console.log("svgText", svgText);
  console.log("url", url);
  return `data:image/svg+xml;base64,${btoa(svgText)}`;
};

export const isValidHex = (value: string) =>
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);

export const isWhiteHex = (hex: string): boolean => {
  const formatted = hex.toLowerCase();
  return formatted === WHITE_COLOR || formatted === SHORT_WHITE_COLOR;
};
