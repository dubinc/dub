import { normalizeActiveFilter } from "@dub/ui";
import { describe, expect, test } from "vitest";

describe("normalizeActiveFilter", () => {
  describe("New format (already normalized)", () => {
    test("returns unchanged if already has operator and values array", () => {
      const input = {
        key: "country",
        operator: "IS_ONE_OF" as const,
        values: ["US", "BR"],
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual(input);
    });

    test("handles IS_NOT operator", () => {
      const input = {
        key: "device",
        operator: "IS_NOT" as const,
        values: ["Mobile"],
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual(input);
    });

    test("handles IS_NOT_ONE_OF operator", () => {
      const input = {
        key: "country",
        operator: "IS_NOT_ONE_OF" as const,
        values: ["US", "BR", "FR"],
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual(input);
    });
  });

  describe("Legacy singular format { key, value }", () => {
    test("converts single value to IS operator with values array", () => {
      const input = {
        key: "country",
        value: "US",
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual({
        key: "country",
        operator: "IS",
        values: ["US"],
      });
    });

    test("handles string values", () => {
      const input = {
        key: "domain",
        value: "dub.sh",
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual({
        key: "domain",
        operator: "IS",
        values: ["dub.sh"],
      });
    });

    test("handles non-string values", () => {
      const input = {
        key: "userId",
        value: 123,
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual({
        key: "userId",
        operator: "IS",
        values: [123],
      });
    });
  });

  describe("Legacy plural format { key, values }", () => {
    test("single value becomes IS operator", () => {
      const input = {
        key: "tagIds",
        values: ["tag_123"],
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual({
        key: "tagIds",
        operator: "IS",
        values: ["tag_123"],
      });
    });

    test("multiple values becomes IS_ONE_OF operator", () => {
      const input = {
        key: "tagIds",
        values: ["tag_123", "tag_456", "tag_789"],
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual({
        key: "tagIds",
        operator: "IS_ONE_OF",
        values: ["tag_123", "tag_456", "tag_789"],
      });
    });

    test("two values becomes IS_ONE_OF operator", () => {
      const input = {
        key: "country",
        values: ["US", "BR"],
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual({
        key: "country",
        operator: "IS_ONE_OF",
        values: ["US", "BR"],
      });
    });

    test("empty values array becomes IS with empty array", () => {
      const input = {
        key: "tagIds",
        values: [],
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual({
        key: "tagIds",
        operator: "IS",
        values: [],
      });
    });
  });

  describe("Edge cases", () => {
    test("handles filter without operator or values", () => {
      const input = {
        key: "country",
      } as any;
      const result = normalizeActiveFilter(input);
      expect(result).toEqual({
        key: "country",
        operator: "IS",
        values: [],
      });
    });

    test("preserves other properties not in the spec", () => {
      const input = {
        key: "country",
        value: "US",
        // @ts-expect-error - testing extra properties
        extraProp: "should be ignored",
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual({
        key: "country",
        operator: "IS",
        values: ["US"],
      });
      // Extra properties are not preserved
      expect(result).not.toHaveProperty("extraProp");
    });
  });

  describe("Real-world scenarios", () => {
    test("Links page tags filter (multiple: true, hideOperator: true)", () => {
      const input = {
        key: "tagIds",
        values: ["tag_abc", "tag_def"],
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual({
        key: "tagIds",
        operator: "IS_ONE_OF",
        values: ["tag_abc", "tag_def"],
      });
    });

    test("Analytics page with advanced filters", () => {
      const input = {
        key: "country",
        operator: "IS_NOT_ONE_OF" as const,
        values: ["US", "GB"],
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual(input);
    });

    test("Single domain filter (legacy format)", () => {
      const input = {
        key: "domain",
        value: "dub.sh",
      };
      const result = normalizeActiveFilter(input);
      expect(result).toEqual({
        key: "domain",
        operator: "IS",
        values: ["dub.sh"],
      });
    });
  });
});
