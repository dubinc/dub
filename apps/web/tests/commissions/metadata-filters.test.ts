import {
  buildCommissionMetadataWhere,
  parseCommissionMetadataQuery,
} from "@/lib/api/commissions/metadata-filters";
import { DubApiError } from "@/lib/api/errors";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("parseCommissionMetadataQuery", () => {
  it("returns undefined for absent, empty, or whitespace-only query", () => {
    expect(parseCommissionMetadataQuery(undefined)).toBeUndefined();
    expect(parseCommissionMetadataQuery("")).toBeUndefined();
    expect(parseCommissionMetadataQuery("   ")).toBeUndefined();
  });

  it("parses = operator", () => {
    expect(parseCommissionMetadataQuery("metadata['plan']='pro'")).toEqual({
      logic: "AND",
      filters: [{ key: "plan", op: "equals", value: "pro" }],
    });
  });

  it("parses : as equals", () => {
    expect(parseCommissionMetadataQuery("metadata['plan']:pro")).toEqual({
      logic: "AND",
      filters: [{ key: "plan", op: "equals", value: "pro" }],
    });
  });

  it("parses != operator", () => {
    expect(parseCommissionMetadataQuery("metadata['plan']!='free'")).toEqual({
      logic: "AND",
      filters: [{ key: "plan", op: "notEquals", value: "free" }],
    });
  });

  it("parses AND connective", () => {
    expect(
      parseCommissionMetadataQuery(
        "metadata['plan']='pro' AND metadata['tier']='gold'",
      ),
    ).toEqual({
      logic: "AND",
      filters: [
        { key: "plan", op: "equals", value: "pro" },
        { key: "tier", op: "equals", value: "gold" },
      ],
    });
  });

  it("parses OR connective (case-insensitive)", () => {
    expect(
      parseCommissionMetadataQuery(
        "metadata['plan']='pro' or metadata['plan']='enterprise'",
      ),
    ).toEqual({
      logic: "OR",
      filters: [
        { key: "plan", op: "equals", value: "pro" },
        { key: "plan", op: "equals", value: "enterprise" },
      ],
    });
  });

  it("rejects nested metadata keys", () => {
    expect(() =>
      parseCommissionMetadataQuery("metadata['a']['b']='value'"),
    ).toThrow(DubApiError);
    try {
      parseCommissionMetadataQuery("metadata['a']['b']='value'");
    } catch (error) {
      expect(error).toBeInstanceOf(DubApiError);
      expect((error as DubApiError).code).toBe("unprocessable_entity");
    }
  });

  it("rejects dotted metadata keys", () => {
    expect(() =>
      parseCommissionMetadataQuery("metadata['a.b']='value'"),
    ).toThrow(DubApiError);
  });

  it("rejects mixed AND and OR", () => {
    expect(() =>
      parseCommissionMetadataQuery(
        "metadata['a']='1' AND metadata['b']='2' OR metadata['c']='3'",
      ),
    ).toThrow(DubApiError);
    try {
      parseCommissionMetadataQuery(
        "metadata['a']='1' AND metadata['b']='2' OR metadata['c']='3'",
      );
    } catch (error) {
      expect((error as DubApiError).message).toBe(
        "Metadata query cannot mix AND and OR.",
      );
    }
  });

  it("rejects unsupported comparison operators", () => {
    for (const query of [
      "metadata['seats']>5",
      "metadata['seats']<5",
      "metadata['seats']>=5",
      "metadata['seats']<=5",
    ]) {
      expect(() => parseCommissionMetadataQuery(query)).toThrow(DubApiError);
      try {
        parseCommissionMetadataQuery(query);
      } catch (error) {
        expect((error as DubApiError).message).toBe(
          "Metadata query only supports `=` and `!=` operators.",
        );
      }
    }
  });

  it("rejects non-metadata fields and junk", () => {
    expect(() => parseCommissionMetadataQuery("status:active")).toThrow(
      DubApiError,
    );
    expect(() => parseCommissionMetadataQuery("not-a-query")).toThrow(
      DubApiError,
    );
  });

  it("preserves filter values containing --, ;, \\, /*, and */", () => {
    expect(parseCommissionMetadataQuery("metadata['sku']='AB--12'")).toEqual({
      logic: "AND",
      filters: [{ key: "sku", op: "equals", value: "AB--12" }],
    });
    expect(
      parseCommissionMetadataQuery("metadata['name']='Smith; Jane'"),
    ).toEqual({
      logic: "AND",
      filters: [{ key: "name", op: "equals", value: "Smith; Jane" }],
    });
    expect(parseCommissionMetadataQuery("metadata['path']='a\\b'")).toEqual({
      logic: "AND",
      filters: [{ key: "path", op: "equals", value: "a\\b" }],
    });
    expect(
      parseCommissionMetadataQuery("metadata['note']='/* comment */'"),
    ).toEqual({
      logic: "AND",
      filters: [{ key: "note", op: "equals", value: "/* comment */" }],
    });
  });

  it("allows up to 5 conditions and rejects more", () => {
    const five = [
      "metadata['a']='1'",
      "metadata['b']='2'",
      "metadata['c']='3'",
      "metadata['d']='4'",
      "metadata['e']='5'",
    ].join(" AND ");
    expect(parseCommissionMetadataQuery(five)?.filters).toHaveLength(5);

    const six = `${five} AND metadata['f']='6'`;
    expect(() => parseCommissionMetadataQuery(six)).toThrow(DubApiError);
    try {
      parseCommissionMetadataQuery(six);
    } catch (error) {
      expect((error as DubApiError).code).toBe("unprocessable_entity");
      expect((error as DubApiError).message).toBe(
        "Metadata query supports at most 5 conditions.",
      );
    }
  });
});

describe("buildCommissionMetadataWhere", () => {
  it("returns undefined for undefined input", () => {
    expect(buildCommissionMetadataWhere(undefined)).toBeUndefined();
  });

  it("builds a single equals clause", () => {
    expect(
      buildCommissionMetadataWhere({
        logic: "AND",
        filters: [{ key: "plan", op: "equals", value: "pro" }],
      }),
    ).toEqual({
      metadata: { path: "$.plan", equals: "pro" },
    });
  });

  it("builds a single notEquals clause", () => {
    expect(
      buildCommissionMetadataWhere({
        logic: "AND",
        filters: [{ key: "plan", op: "notEquals", value: "free" }],
      }),
    ).toEqual({
      metadata: { path: "$.plan", not: "free" },
    });
  });

  it("builds AND of multiple clauses", () => {
    expect(
      buildCommissionMetadataWhere({
        logic: "AND",
        filters: [
          { key: "plan", op: "equals", value: "pro" },
          { key: "tier", op: "equals", value: "gold" },
        ],
      }),
    ).toEqual({
      AND: [
        { metadata: { path: "$.plan", equals: "pro" } },
        { metadata: { path: "$.tier", equals: "gold" } },
      ],
    });
  });

  it("builds OR of multiple clauses", () => {
    expect(
      buildCommissionMetadataWhere({
        logic: "OR",
        filters: [
          { key: "plan", op: "equals", value: "pro" },
          { key: "plan", op: "equals", value: "enterprise" },
        ],
      }),
    ).toEqual({
      OR: [
        { metadata: { path: "$.plan", equals: "pro" } },
        { metadata: { path: "$.plan", equals: "enterprise" } },
      ],
    });
  });
});
