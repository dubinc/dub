import { buildMetadataSql } from "@/lib/metadata-filters/metadata-sql";
import type { MetadataFilter } from "@/lib/metadata-filters/parse-metadata-query";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

describe("buildMetadataSql", () => {
  it("builds a single equals predicate with bound path and value", () => {
    const sql = buildMetadataSql([
      { key: "plan", operator: "equals", value: "pro" },
    ]);

    expect(sql.sql).toBe("JSON_UNQUOTE(JSON_EXTRACT(c.metadata, ?)) = ?");
    expect(sql.values).toEqual(["$.plan", "pro"]);
  });

  it.each([
    ["notEquals", "!="],
    ["greaterThan", ">"],
    ["lessThan", "<"],
    ["greaterThanOrEqual", ">="],
    ["lessThanOrEqual", "<="],
  ] as const)("maps %s to %s", (operator, op) => {
    const sql = buildMetadataSql([{ key: "seats", operator, value: "10" }]);

    expect(sql.sql).toBe(`JSON_UNQUOTE(JSON_EXTRACT(c.metadata, ?)) ${op} ?`);
    expect(sql.values).toEqual(["$.seats", "10"]);
  });

  it("ANDs multiple predicates", () => {
    const filters: MetadataFilter[] = [
      { key: "plan", operator: "equals", value: "pro" },
      { key: "tier", operator: "equals", value: "gold" },
    ];

    const sql = buildMetadataSql(filters);

    expect(sql.sql).toBe(
      "JSON_UNQUOTE(JSON_EXTRACT(c.metadata, ?)) = ? AND JSON_UNQUOTE(JSON_EXTRACT(c.metadata, ?)) = ?",
    );
    expect(sql.values).toEqual(["$.plan", "pro", "$.tier", "gold"]);
  });

  it("accepts a custom column fragment", () => {
    const sql = buildMetadataSql(
      [{ key: "plan", operator: "equals", value: "pro" }],
      Prisma.raw("Commission.metadata"),
    );

    expect(sql.sql).toBe(
      "JSON_UNQUOTE(JSON_EXTRACT(Commission.metadata, ?)) = ?",
    );
    expect(sql.values).toEqual(["$.plan", "pro"]);
  });
});
