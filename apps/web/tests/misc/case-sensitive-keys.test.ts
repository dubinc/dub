import { decodeKey, encodeKey } from "@/lib/api/links/case-sensitivity";
import { describe, expect, it } from "vitest";

const basicKeys = [
  "Hello World",
  "Case-Sensitive123",
  "!@#$%^&*()",
  "🌟⭐️✨",
  "Mixed🌟Emoji⭐️Text",
  "ñáéíóúü",
  "漢字",
  "abc",
];

const edgeCaseKeys = [
  "", // empty string
  " ", // single space
  "   ", // multiple spaces
  "\t\n\r", // control characters
  "a".repeat(100), // long string
  "a".repeat(1000), // very long string
];

const urlLikeKeys = [
  "path/to/resource",
  "query?param=value",
  "hash#section",
  "user:pass@host",
  "multiple/levels/of/nesting/in/path",
  "mixed/path?with=query&and#hash",
];

const specialCharKeys = [
  "+_)(*&^%$#@!~",
  "\\\\\\", // multiple backslashes
  "'''\"\"\"", // quotes
  "tabs\t\t\tspaces   newlines\n\n",
  "null\0byte", // null byte
  "unicode→↓←↑", // arrows
  "mixing→special\t\nchars\0with★unicode",
];

const unicodeKeys = [
  "한글테스트", // Korean
  "测试中文", // Chinese
  "русский", // Russian
  "العربية", // Arabic
  "עִברִית", // Hebrew
  "🌈🌟⭐️✨🌙☀️", // Only emojis
  "👨‍👩‍👧‍👦", // Complex emoji (family)
  "नमस्ते", // Hindi
  "ᚠᚢᚦᚨᚱᚲ", // Runic
];

describe("case-sensitive key encoding/decoding - basic cases", () => {
  basicKeys.forEach((key) => {
    it(`should handle: ${key}`, () => {
      const encoded = encodeKey(key);
      const decoded = decodeKey(encoded);
      expect(decoded).toBe(key);
    });
  });
});

describe("case-sensitive key encoding/decoding - edge cases", () => {
  edgeCaseKeys.forEach((key) => {
    it(`should handle edge case: ${key.length > 20 ? `${key.slice(0, 20)}... (length: ${key.length})` : key}`, () => {
      const encoded = encodeKey(key);
      const decoded = decodeKey(encoded);
      expect(decoded).toBe(key);
    });
  });
});

describe("case-sensitive key encoding/decoding - URL-like strings", () => {
  urlLikeKeys.forEach((key) => {
    it(`should handle URL-like string: ${key}`, () => {
      const encoded = encodeKey(key);
      const decoded = decodeKey(encoded);
      expect(decoded).toBe(key);
    });
  });
});

describe("case-sensitive key encoding/decoding - special characters", () => {
  specialCharKeys.forEach((key) => {
    it(`should handle special chars: ${key}`, () => {
      const encoded = encodeKey(key);
      const decoded = decodeKey(encoded);
      expect(decoded).toBe(key);
    });
  });
});

describe("case-sensitive key encoding/decoding - unicode", () => {
  unicodeKeys.forEach((key) => {
    it(`should handle unicode: ${key}`, () => {
      const encoded = encodeKey(key);
      const decoded = decodeKey(encoded);
      expect(decoded).toBe(key);
    });
  });
});

describe("case sensitivity variants", () => {
  const variantGroups = [
    ["github", "GITHUB", "Github", "gitHub"],
    ["TEST", "test", "Test", "tEsT"],
    ["Mixed_Case_123", "MIXED_CASE_123", "mixed_case_123"],
    ["URL-Path", "url-path", "Url-Path", "URL-PATH"],
  ];

  variantGroups.forEach((variants, index) => {
    it(`variant group ${index + 1} should produce unique encodings`, () => {
      const encodedKeys = new Set(variants.map(encodeKey));
      expect(encodedKeys.size).toBe(variants.length); // Ensure uniqueness

      variants.forEach((variant) => {
        expect(decodeKey(encodeKey(variant))).toBe(variant);
      });
    });
  });
});

describe("encoding consistency", () => {
  const testKey = "Test-Key-123";
  
  it("should produce consistent encodings", () => {
    const firstEncoding = encodeKey(testKey);
    for (let i = 0; i < 100; i++) {
      expect(encodeKey(testKey)).toBe(firstEncoding);
    }
  });

  it("should handle repeated encode/decode cycles", () => {
    let value = testKey;
    for (let i = 0; i < 10; i++) {
      value = decodeKey(encodeKey(value));
      expect(value).toBe(testKey);
    }
  });
});
