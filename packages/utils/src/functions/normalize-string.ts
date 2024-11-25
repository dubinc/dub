export const normalizeString = (key: string) => {
  if (!key) return "";

  const original = key;
  const normalized = key
    // Remove BOM and other special characters
    .replace(/^\uFEFF/, "")
    .replace(/^\uFFFE/, "")
    .replace(/^\uEFBBBF/, "")
    .replace(/^\u0000\uFEFF/, "")
    .replace(/^\uFFFE0000/, "")
    .replace(/^\u2028/, "")
    .replace(/^\u2029/, "")
    // Remove any non-printable characters
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim()
    // Optional: normalize case
    .toLowerCase();

  // Optional: Add logging in development
  if (process.env.NODE_ENV === "development" && original !== normalized) {
    console.log(`Normalized key: "${original}" -> "${normalized}"`);
    console.log(
      "Original char codes:",
      Array.from(original).map((c) => c.charCodeAt(0)),
    );
  }

  return normalized;
};
