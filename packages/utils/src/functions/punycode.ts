import punycodeHelper from "punycode/";

export function punycode(str?: string | null) {
  if (typeof str !== "string") return "";
  return punycodeHelper.toUnicode(str);
}

export function punyEncode(str?: string | null) {
  if (typeof str !== "string") return "";
  return punycodeHelper.toASCII(str);
}
