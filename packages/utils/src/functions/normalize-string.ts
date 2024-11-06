export const normalizeString = (key: string) => {
  const original = key;
  const normalized = key
    .replace(/^\uFEFF/, "")
    .replace(/^\uFFFE/, "")
    .replace(/^\uEFBBBF/, "")
    .replace(/^\u0000\uFEFF/, "")
    .replace(/^\uFFFE0000/, "")
    .replace(/^\u2028/, "")
    .replace(/^\u2029/, "")
    .trim();

  if (original !== normalized) {
    console.log(`Normalized key: "${original}" -> "${normalized}"`);
    console.log(
      "Original char codes:",
      Array.from(original).map((c) => c.charCodeAt(0)),
    );
    console.log(
      "Normalized char codes:",
      Array.from(normalized).map((c) => c.charCodeAt(0)),
    );
  }

  return normalized;
};
