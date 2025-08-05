import { queryParser } from "@/lib/analytics/query-parser";
import { describe, expect, it } from "vitest";

describe("Analytics Query Parser", () => {
  it("should parse simple nested property", () => {
    const result = queryParser("metadata['key']:value");
    expect(result).toEqual({
      filters: [
        { operand: "metadata.key", operator: "equals", value: "value" },
      ],
      logicalOperator: "AND",
    });
  });

  it("should parse nested property with double quotes", () => {
    const result = queryParser('metadata["key"]:"quoted value"');
    expect(result).toEqual({
      filters: [
        { operand: "metadata.key", operator: "equals", value: "quoted value" },
      ],
      logicalOperator: "AND",
    });
  });

  it("should parse deeply nested property", () => {
    const result = queryParser("metadata['level1']['level2']['level3']:value");
    expect(result).toEqual({
      filters: [
        {
          operand: "metadata.level1.level2.level3",
          operator: "equals",
          value: "value",
        },
      ],
      logicalOperator: "AND",
    });
  });

  it("should parse nested property with complex path", () => {
    const result = queryParser("metadata['user']['preferences']['theme']:dark");
    expect(result).toEqual({
      filters: [
        {
          operand: "metadata.user.preferences.theme",
          operator: "equals",
          value: "dark",
        },
      ],
      logicalOperator: "AND",
    });
  });

  it("should parse equals operator (:) for nested property", () => {
    const result = queryParser("metadata['key']:value");
    expect(result).toEqual({
      filters: [
        { operand: "metadata.key", operator: "equals", value: "value" },
      ],
      logicalOperator: "AND",
    });
  });

  it("should parse not equals operator for nested property", () => {
    const result = queryParser("metadata['status']!=completed");
    expect(result).toEqual({
      filters: [
        { operand: "metadata.status", operator: "notEquals", value: "completed" },
      ],
      logicalOperator: "AND",
    });
  });

  it("should handle empty query", () => {
    const result = queryParser("");
    expect(result).toBeUndefined();
  });

  it("should handle null query", () => {
    const result = queryParser(null as any);
    expect(result).toBeUndefined();
  });

  it("should handle undefined query", () => {
    const result = queryParser(undefined as any);
    expect(result).toBeUndefined();
  });

  it("should handle whitespace-only query", () => {
    const result = queryParser("   ");
    expect(result).toBeUndefined();
  });
});
