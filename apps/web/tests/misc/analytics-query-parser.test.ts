import { parseFiltersFromQuery } from "@/lib/analytics/utils/analytics-query-parser";
import { describe, expect, it } from "vitest";

describe("Analytics Query Parser", () => {
  it("should parse simple nested property", () => {
    const result = parseFiltersFromQuery("metadata['key']:value");
    expect(result).toEqual([
      { operand: "metadata.key", operator: "equals", value: "value" },
    ]);
  });

  it("should parse nested property with double quotes", () => {
    const result = parseFiltersFromQuery('metadata["key"]:"quoted value"');
    expect(result).toEqual([
      { operand: "metadata.key", operator: "equals", value: "quoted value" },
    ]);
  });

  it("should parse deeply nested property", () => {
    const result = parseFiltersFromQuery(
      "metadata['level1']['level2']['level3']:value",
    );
    expect(result).toEqual([
      {
        operand: "metadata.level1.level2.level3",
        operator: "equals",
        value: "value",
      },
    ]);
  });

  it("should parse nested property with complex path", () => {
    const result = parseFiltersFromQuery(
      "metadata['user']['preferences']['theme']:dark",
    );
    expect(result).toEqual([
      {
        operand: "metadata.user.preferences.theme",
        operator: "equals",
        value: "dark",
      },
    ]);
  });

  it("should parse equals operator (:) for nested property", () => {
    const result = parseFiltersFromQuery("metadata['key']:value");
    expect(result).toEqual([
      { operand: "metadata.key", operator: "equals", value: "value" },
    ]);
  });

  it("should parse not equals operator for nested property", () => {
    const result = parseFiltersFromQuery("metadata['status']!=completed");
    expect(result).toEqual([
      { operand: "metadata.status", operator: "notEquals", value: "completed" },
    ]);
  });

  it("should handle empty query", () => {
    const result = parseFiltersFromQuery("");
    expect(result).toBeUndefined();
  });

  it("should handle null query", () => {
    const result = parseFiltersFromQuery(null as any);
    expect(result).toBeUndefined();
  });

  it("should handle undefined query", () => {
    const result = parseFiltersFromQuery(undefined as any);
    expect(result).toBeUndefined();
  });

  it("should handle whitespace-only query", () => {
    const result = parseFiltersFromQuery("   ");
    expect(result).toBeUndefined();
  });
});
