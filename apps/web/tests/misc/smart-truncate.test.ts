import { smartTruncate } from "@dub/utils";
import { describe, expect, it } from "vitest";

const LIMIT = 33;

describe("smartTruncate", () => {
  describe("protocol handling", () => {
    it("strips https:// and returns the pretty URL when it fits", () => {
      expect(smartTruncate("https://refer.acme.com/partner", LIMIT)).toBe(
        "refer.acme.com/partner",
      );
      expect(smartTruncate("https://refer.acme.com/f6s", LIMIT)).toBe(
        "refer.acme.com/f6s",
      );
      expect(smartTruncate("https://refer.acme.com/twitter", LIMIT)).toBe(
        "refer.acme.com/twitter",
      );
    });

    it("strips http:// the same way", () => {
      expect(smartTruncate("http://refer.acme.com/partner", LIMIT)).toBe(
        "refer.acme.com/partner",
      );
    });

    it("leaves already-pretty URLs unchanged when they fit", () => {
      expect(smartTruncate("refer.acme.com/partner", LIMIT)).toBe(
        "refer.acme.com/partner",
      );
    });

    it("produces the same output for stored and pretty inputs", () => {
      const stored =
        "https://acme.com/super-long-path-that-is-way-too-long-and-should-be-truncated";
      const pretty =
        "acme.com/super-long-path-that-is-way-too-long-and-should-be-truncated";

      expect(smartTruncate(stored, LIMIT)).toBe(smartTruncate(pretty, LIMIT));
    });

    it("preserves www. on custom domains", () => {
      expect(smartTruncate("https://www.acme.com/launch", LIMIT)).toBe(
        "www.acme.com/launch",
      );
    });
  });

  describe("short links that fit after stripping the protocol", () => {
    it("keeps default nanoid, dub.link, .dub.link, and branded domains", () => {
      expect(smartTruncate("https://dub.sh/xYz9AbC", LIMIT)).toBe(
        "dub.sh/xYz9AbC",
      );
      expect(smartTruncate("https://dub.link/abcde", LIMIT)).toBe(
        "dub.link/abcde",
      );
      expect(smartTruncate("https://acme.dub.link/promo", LIMIT)).toBe(
        "acme.dub.link/promo",
      );
      expect(smartTruncate("https://git.new/dub", LIMIT)).toBe("git.new/dub");
    });

    it("keeps dotted, hyphenated, and underscored keys", () => {
      expect(smartTruncate("https://acme.com/file.name", LIMIT)).toBe(
        "acme.com/file.name",
      );
      expect(smartTruncate("https://acme.com/launch-2024", LIMIT)).toBe(
        "acme.com/launch-2024",
      );
      expect(smartTruncate("https://acme.com/my_link", LIMIT)).toBe(
        "acme.com/my_link",
      );
    });

    it("keeps prefixed and nested keys that fit", () => {
      expect(smartTruncate("https://dub.sh/gh/xYz9AbC", LIMIT)).toBe(
        "dub.sh/gh/xYz9AbC",
      );
      expect(smartTruncate("https://acme.com/linkedin/more/path", LIMIT)).toBe(
        "acme.com/linkedin/more/path",
      );
    });
  });

  describe("root domain links", () => {
    it("strips the protocol and does not append a slash", () => {
      expect(smartTruncate("https://acme.com", LIMIT)).toBe("acme.com");
    });

    it("truncates a long apex while preserving the TLD", () => {
      expect(
        smartTruncate("https://verylongcustomapexdomainnamehere.com", LIMIT),
      ).toBe("verylongcustomapexdomainnam...com");
    });
  });

  describe("path-first truncation", () => {
    it("keeps a short key and TLD-truncates a long domain", () => {
      expect(
        smartTruncate("https://superlongcustomdomainnamehere.com/x", LIMIT),
      ).toBe("superlongcustomdomainname...com/x");
    });

    it("keeps a short domain and left-truncates a long key", () => {
      expect(
        smartTruncate(
          "https://acme.com/super-long-path-that-is-way-too-long-and-should-be-truncated",
          LIMIT,
        ),
      ).toBe("acme.com/super-long-path-that-...");
    });

    it("truncates both when domain and path overflow", () => {
      expect(
        smartTruncate(
          "https://acmesuperlongdomain.com/super-long-path-that-is-way-too-long-and-should-be-truncated",
          LIMIT,
        ),
      ).toBe("ac...com/super-long-path-that-...");
    });

    it("left-truncates nested keys from the start", () => {
      expect(
        smartTruncate(
          "https://acme.com/linkedin/more/path/that/is/very/long",
          LIMIT,
        ),
      ).toBe("acme.com/linkedin/more/path/th...");
    });
  });

  describe("punycode and case-sensitive keys", () => {
    it("parses punycode hosts and keys without decoding them", () => {
      expect(smartTruncate("https://xn--n3h.com/xn--fsq", LIMIT)).toBe(
        "xn--n3h.com/xn--fsq",
      );
      expect(
        smartTruncate(
          "https://xn--n3h.com/xn--longpunycodekeythatexceedsthelimit",
          LIMIT,
        ),
      ).toBe("xn...com/xn--longpunycodekeyth...");
    });

    it("treats case-sensitive encoded keys as a normal path", () => {
      expect(smartTruncate("https://acme.co/cAsE-sensitive-TeSt", LIMIT)).toBe(
        "acme.co/cAsE-sensitive-TeSt",
      );
      expect(
        smartTruncate(
          "https://acme.co/VeryLongCaseSensitiveEncodedKeyValueHere",
          LIMIT,
        ),
      ).toBe("acme.co/VeryLongCaseSensitive...");
    });
  });

  describe("length budget", () => {
    it("never exceeds maxLength when truncation runs", () => {
      const inputs = [
        "https://refer.acme.com/partner-name-that-is-quite-long",
        "https://acmesuperlongdomain.com/super-long-path-that-is-way-too-long-and-should-be-truncated",
        "https://verylongcustomapexdomainnamehere.com",
        "https://superlongcustomdomainnamehere.com/x",
        "https://acme.com/linkedin/more/path/that/is/very/long",
        "https://xn--n3h.com/xn--longpunycodekeythatexceedsthelimit",
        "http://acmesuperlongdomain.com/gh/prefixed-key-that-is-also-very-long",
      ];

      for (const input of inputs) {
        const output = smartTruncate(input, LIMIT);
        expect(output.length).toBeLessThanOrEqual(LIMIT);
      }
    });
  });
});
