import { DubApiError } from "@/lib/api/errors";
import { parseMetadataQuery } from "@/lib/metadata-filters/parse-metadata-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("parseMetadataQuery", () => {
  it("returns undefined when query is absent", () => {
    expect(parseMetadataQuery(undefined)).toBeUndefined();
  });

  it("returns undefined when query is empty string", () => {
    expect(parseMetadataQuery("")).toBeUndefined();
  });

  it("parses top-level equals", () => {
    expect(parseMetadataQuery("metadata['plan']:'pro'")).toEqual([
      { key: "plan", operator: "equals", value: "pro" },
    ]);
  });

  it("parses notEquals", () => {
    expect(parseMetadataQuery("metadata['status']!=completed")).toEqual([
      { key: "status", operator: "notEquals", value: "completed" },
    ]);
  });

  it("parses AND of two top-level keys", () => {
    expect(
      parseMetadataQuery("metadata['plan']:'pro' AND metadata['tier']:'gold'"),
    ).toEqual([
      { key: "plan", operator: "equals", value: "pro" },
      { key: "tier", operator: "equals", value: "gold" },
    ]);
  });

  it("throws 422 for nested keys", () => {
    expect(() => parseMetadataQuery("metadata['a']['b']:'x'")).toThrow(
      DubApiError,
    );

    try {
      parseMetadataQuery("metadata['a']['b']:'x'");
    } catch (e) {
      expect(e).toBeInstanceOf(DubApiError);
      expect((e as DubApiError).code).toBe("unprocessable_entity");
    }
  });

  it("throws 422 for dotted keys", () => {
    expect(() => parseMetadataQuery("metadata['a.b']:'x'")).toThrow(
      DubApiError,
    );
  });

  it("throws 422 for OR", () => {
    expect(() =>
      parseMetadataQuery("metadata['plan']:'pro' OR metadata['plan']:'basic'"),
    ).toThrow(DubApiError);
  });

  it("throws 422 for non-metadata field queries", () => {
    expect(() => parseMetadataQuery("amount:100")).toThrow(DubApiError);
  });

  it("throws 422 for empty junk", () => {
    expect(() => parseMetadataQuery("   ")).toThrow(DubApiError);
    expect(() => parseMetadataQuery("not-a-query")).toThrow(DubApiError);
  });
});
