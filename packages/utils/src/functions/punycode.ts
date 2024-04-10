import punycodeHelper from "punycode/";

export function punycode(str?: string | null) {
  if (typeof str !== "string") return "";
  try {
    return punycodeHelper.toUnicode(str);
  } catch (e) {
    return str;
  }
}

export function punyEncode(str?: string | null) {
  if (typeof str !== "string") return "";
  return punycodeHelper.toASCII(str);
}
