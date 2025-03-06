import { decodeKey, encodeKey } from "@/lib/api/links/case-sensitivity";
import { describe, expect, it } from "vitest";

const keys = [
  "Hello World",
  "Case-Sensitive123",
  "!@#$%^&*()",
  "🌟⭐️✨",
  "Mixed🌟Emoji⭐️Text",
  "ñáéíóúü",
  "漢字",
  "abc",
];

describe("case-sensitive key encoding/decoding", () => {
  keys.forEach((key) => {
    it(key, () => {
      const encoded = encodeKey(key);
      const decoded = decodeKey(encoded);

      expect(decoded).toBe(key);
    });
  });
});

it("variant of same key should be encoded differently", () => {
  const variants = ["github", "GITHUB", "Github", "gitHub"];
  const encodedKeys = new Set(variants.map(encodeKey));

  expect(encodedKeys.size).toBe(variants.length); // Ensure uniqueness

  variants.forEach((variant) => {
    expect(decodeKey(encodeKey(variant))).toBe(variant);
  });
});
