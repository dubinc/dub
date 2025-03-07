import { decodeKey, encodeKey } from "@/lib/api/links/case-sensitivity";
import { describe, expect, it } from "vitest";

const testCases = {
  "basic strings": [
    "Hello World",
    "Case-Sensitive123",
    "abc",
    "!@#$%^&*()",
    "+_)(*&^%$#@!~",
  ],
  "special content": [
    "\\\\\\", // backslashes
    "'''\"\"\"", // quotes
    "\t\n\r", // control characters
    "null\0byte", // null byte
    "unicode→↓←↑", // arrows
    "🌟⭐️✨", // basic emojis
    "Mixed🌟Emoji⭐️Text", // mixed content
    "👨‍👩‍👧‍👦", // complex emoji
  ],
  international: [
    "漢字한글テストñáéíóúüрусскийالعربية", // mixed scripts
    "עִברִית नमस्ते ᚠᚢᚦᚨᚱᚲ", // more scripts
  ],
  "URLs and paths": [
    "path/to/resource",
    "query?param=value&complex=true#hash",
    "user:pass@host:8080/path?query#fragment",
  ],
  "edge cases": [
    "", // empty
    " ", // single space
    "   ", // multiple spaces
    "a".repeat(100), // long string
  ],
};

const caseVariants = [
  ["github", "GITHUB", "Github", "gitHub"],
  ["URL-Path", "url-path", "Url-Path", "URL-PATH"],
  ["Mixed_Case_123", "MIXED_CASE_123", "mixed_case_123"],
];

describe("case-sensitive key encoding/decoding", () => {
  Object.entries(testCases).forEach(([category, cases]) => {
    describe(category, () => {
      cases.forEach((input) => {
        const testName =
          input.length > 20
            ? `${input.slice(0, 20)}... (${input.length})`
            : input || "(empty string)";

        it(testName, () => {
          const encoded = encodeKey(input);
          const decoded = decodeKey(encoded);

          expect(decoded).toBe(input);
        });
      });
    });
  });

  it("should handle case variants correctly", () => {
    caseVariants.forEach((variants, i) => {
      const encodedSet = new Set(variants.map(encodeKey));

      expect(encodedSet.size).toBe(variants.length);

      variants.forEach((variant) => {
        const encoded = encodeKey(variant);
        const decoded = decodeKey(encoded);
        expect(decoded).toBe(variant);
      });
    });
  });
});
