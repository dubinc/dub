import { parseFilterValue, buildFilterValue } from "@dub/utils";
import { buildAdvancedFilters } from "@/lib/analytics/build-advanced-filters";
import { describe, expect, test } from "vitest";

describe("Advanced Filters - Unit Tests", () => {
  describe("parseFilterValue", () => {
    describe("Single Values", () => {
      test("single positive value", () => {
        const result = parseFilterValue("US");
        expect(result).toEqual({
          operator: "IS",
          sqlOperator: "IN",
          values: ["US"],
        });
      });

      test("single negative value", () => {
        const result = parseFilterValue("-US");
        expect(result).toEqual({
          operator: "IS_NOT",
          sqlOperator: "NOT IN",
          values: ["US"],
        });
      });
    });

    describe("Multiple Values", () => {
      test("multiple positive values", () => {
        const result = parseFilterValue("US,BR,FR");
        expect(result).toEqual({
          operator: "IS_ONE_OF",
          sqlOperator: "IN",
          values: ["US", "BR", "FR"],
        });
      });

      test("multiple negative values", () => {
        const result = parseFilterValue("-US,BR,FR");
        expect(result).toEqual({
          operator: "IS_NOT_ONE_OF",
          sqlOperator: "NOT IN",
          values: ["US", "BR", "FR"],
        });
      });

      test("two values", () => {
        const result = parseFilterValue("mobile,desktop");
        expect(result).toEqual({
          operator: "IS_ONE_OF",
          sqlOperator: "IN",
          values: ["mobile", "desktop"],
        });
      });
    });

    describe("Edge Cases", () => {
      test("empty string returns undefined", () => {
        expect(parseFilterValue("")).toBeUndefined();
      });

      test("undefined returns undefined", () => {
        expect(parseFilterValue(undefined)).toBeUndefined();
      });

      test("filters empty values from comma-separated", () => {
        const result = parseFilterValue("US,,BR");
        expect(result?.values).toEqual(["US", "BR"]);
      });

      test("trailing comma", () => {
        const result = parseFilterValue("US,BR,");
        expect(result?.values).toEqual(["US", "BR"]);
      });

      test("only commas returns undefined", () => {
        expect(parseFilterValue(",,,")).toBeUndefined();
      });

      test("minus sign only returns undefined", () => {
        expect(parseFilterValue("-")).toBeUndefined();
      });

      test("minus with empty values returns undefined", () => {
        expect(parseFilterValue("-,,,")).toBeUndefined();
      });
    });

    describe("Array Input", () => {
      test("array with single value", () => {
        const result = parseFilterValue(["US"]);
        expect(result).toEqual({
          operator: "IS",
          sqlOperator: "IN",
          values: ["US"],
        });
      });

      test("array with multiple values", () => {
        const result = parseFilterValue(["US", "BR", "FR"]);
        expect(result).toEqual({
          operator: "IS_ONE_OF",
          sqlOperator: "IN",
          values: ["US", "BR", "FR"],
        });
      });
    });
  });

  describe("buildFilterValue", () => {
    test("rebuild single positive value", () => {
      const result = buildFilterValue({
        operator: "IS",
        sqlOperator: "IN",
        values: ["US"],
      });
      expect(result).toBe("US");
    });

    test("rebuild multiple positive values", () => {
      const result = buildFilterValue({
        operator: "IS_ONE_OF",
        sqlOperator: "IN",
        values: ["US", "BR", "FR"],
      });
      expect(result).toBe("US,BR,FR");
    });

    test("rebuild single negative value", () => {
      const result = buildFilterValue({
        operator: "IS_NOT",
        sqlOperator: "NOT IN",
        values: ["US"],
      });
      expect(result).toBe("-US");
    });

    test("rebuild multiple negative values", () => {
      const result = buildFilterValue({
        operator: "IS_NOT_ONE_OF",
        sqlOperator: "NOT IN",
        values: ["US", "BR"],
      });
      expect(result).toBe("-US,BR");
    });

    describe("Round-trip", () => {
      test("single positive", () => {
        const original = "US";
        const parsed = parseFilterValue(original)!;
        const rebuilt = buildFilterValue(parsed);
        expect(rebuilt).toBe(original);
      });

      test("multiple positive", () => {
        const original = "US,BR,FR";
        const parsed = parseFilterValue(original)!;
        const rebuilt = buildFilterValue(parsed);
        expect(rebuilt).toBe(original);
      });

      test("single negative", () => {
        const original = "-US";
        const parsed = parseFilterValue(original)!;
        const rebuilt = buildFilterValue(parsed);
        expect(rebuilt).toBe(original);
      });

      test("multiple negative", () => {
        const original = "-US,BR,FR";
        const parsed = parseFilterValue(original)!;
        const rebuilt = buildFilterValue(parsed);
        expect(rebuilt).toBe(original);
      });
    });
  });

  describe("buildAdvancedFilters", () => {
    test("single field with IN operator (single value)", () => {
      const result = buildAdvancedFilters({
        country: {
          operator: "IS",
          sqlOperator: "IN",
          values: ["US"],
        },
      });
      expect(result).toEqual([
        {
          field: "country",
          operator: "IN",
          values: ["US"],
        },
      ]);
    });

    test("single field with IN operator", () => {
      const result = buildAdvancedFilters({
        country: {
          operator: "IS_ONE_OF",
          sqlOperator: "IN",
          values: ["US", "BR", "FR"],
        },
      });
      expect(result).toEqual([
        {
          field: "country",
          operator: "IN",
          values: ["US", "BR", "FR"],
        },
      ]);
    });

    test("single field with NOT IN operator", () => {
      const result = buildAdvancedFilters({
        device: {
          operator: "IS_NOT_ONE_OF",
          sqlOperator: "NOT IN",
          values: ["Mobile", "Tablet"],
        },
      });
      expect(result).toEqual([
        {
          field: "device",
          operator: "NOT IN",
          values: ["Mobile", "Tablet"],
        },
      ]);
    });

    test("multiple fields combined", () => {
      const result = buildAdvancedFilters({
        country: {
          operator: "IS_ONE_OF",
          sqlOperator: "IN",
          values: ["US", "BR"],
        },
        device: {
          operator: "IS",
          sqlOperator: "IN",
          values: ["Desktop"],
        },
      });
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        field: "country",
        operator: "IN",
        values: ["US", "BR"],
      });
      expect(result).toContainEqual({
        field: "device",
        operator: "IN",
        values: ["Desktop"],
      });
    });

    test("empty params returns empty array", () => {
      const result = buildAdvancedFilters({});
      expect(result).toEqual([]);
    });

    test("skips undefined fields", () => {
      const result = buildAdvancedFilters({
        country: {
          operator: "IS",
          sqlOperator: "IN",
          values: ["US"],
        },
        city: undefined,
        device: undefined,
      });
      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("country");
    });

    test("handles all supported fields", () => {
      const result = buildAdvancedFilters({
        country: { operator: "IS", sqlOperator: "IN", values: ["US"] },
        city: { operator: "IS", sqlOperator: "IN", values: ["NYC"] },
        device: { operator: "IS", sqlOperator: "IN", values: ["Mobile"] },
        browser: { operator: "IS", sqlOperator: "IN", values: ["Chrome"] },
        os: { operator: "IS", sqlOperator: "IN", values: ["Mac"] },
      });
      expect(result).toHaveLength(5);
      expect(result.map((f) => f.field)).toEqual([
        "country",
        "city",
        "device",
        "browser",
        "os",
      ]);
    });

    test("maintains insertion order", () => {
      const result = buildAdvancedFilters({
        device: { operator: "IS", sqlOperator: "IN", values: ["Mobile"] },
        country: { operator: "IS", sqlOperator: "IN", values: ["US"] },
        browser: { operator: "IS", sqlOperator: "IN", values: ["Chrome"] },
      });
      // Should maintain order from SUPPORTED_FIELDS, not insertion order
      expect(result[0].field).toBe("country");
      expect(result[1].field).toBe("device");
      expect(result[2].field).toBe("browser");
    });
  });
});
