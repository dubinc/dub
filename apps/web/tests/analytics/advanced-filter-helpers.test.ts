import {
  buildAdvancedFilters,
  ensureParsedFilter,
  extractWorkspaceLinkFilters,
} from "@/lib/analytics/filter-helpers";
import { buildFilterValue, parseFilterValue } from "@dub/utils";
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

  describe("ensureParsedFilter", () => {
    test("returns undefined for undefined input", () => {
      expect(ensureParsedFilter(undefined)).toBeUndefined();
    });

    test("returns undefined for empty string", () => {
      expect(ensureParsedFilter("")).toBeUndefined();
    });

    test("converts plain string to IS ParsedFilter", () => {
      const result = ensureParsedFilter("pn_abc123");
      expect(result).toEqual({
        operator: "IS",
        sqlOperator: "IN",
        values: ["pn_abc123"],
      });
    });

    test("passes through ParsedFilter unchanged (IS)", () => {
      const input = {
        operator: "IS" as const,
        sqlOperator: "IN" as const,
        values: ["pn_abc123"],
      };
      expect(ensureParsedFilter(input)).toEqual(input);
    });

    test("passes through ParsedFilter unchanged (IS_NOT)", () => {
      const input = {
        operator: "IS_NOT" as const,
        sqlOperator: "NOT IN" as const,
        values: ["pn_abc123"],
      };
      expect(ensureParsedFilter(input)).toEqual(input);
    });

    test("passes through ParsedFilter with multiple values", () => {
      const input = {
        operator: "IS_ONE_OF" as const,
        sqlOperator: "IN" as const,
        values: ["pn_abc123", "pn_def456"],
      };
      expect(ensureParsedFilter(input)).toEqual(input);
    });

    test("passes through negated ParsedFilter with multiple values", () => {
      const input = {
        operator: "IS_NOT_ONE_OF" as const,
        sqlOperator: "NOT IN" as const,
        values: ["pn_abc123", "pn_def456"],
      };
      expect(ensureParsedFilter(input)).toEqual(input);
    });
  });

  describe("extractWorkspaceLinkFilters - partnerId", () => {
    test("extracts single partnerId with IN operator", () => {
      const result = extractWorkspaceLinkFilters({
        partnerId: {
          operator: "IS",
          sqlOperator: "IN",
          values: ["pn_abc123"],
        },
      });
      expect(result.partnerId).toEqual(["pn_abc123"]);
      expect(result.partnerIdOperator).toBe("IN");
    });

    test("extracts multiple partnerIds with IN operator", () => {
      const result = extractWorkspaceLinkFilters({
        partnerId: {
          operator: "IS_ONE_OF",
          sqlOperator: "IN",
          values: ["pn_abc123", "pn_def456", "pn_ghi789"],
        },
      });
      expect(result.partnerId).toEqual(["pn_abc123", "pn_def456", "pn_ghi789"]);
      expect(result.partnerIdOperator).toBe("IN");
    });

    test("extracts single partnerId with NOT IN operator", () => {
      const result = extractWorkspaceLinkFilters({
        partnerId: {
          operator: "IS_NOT",
          sqlOperator: "NOT IN",
          values: ["pn_abc123"],
        },
      });
      expect(result.partnerId).toEqual(["pn_abc123"]);
      expect(result.partnerIdOperator).toBe("NOT IN");
    });

    test("extracts multiple partnerIds with NOT IN operator", () => {
      const result = extractWorkspaceLinkFilters({
        partnerId: {
          operator: "IS_NOT_ONE_OF",
          sqlOperator: "NOT IN",
          values: ["pn_abc123", "pn_def456"],
        },
      });
      expect(result.partnerId).toEqual(["pn_abc123", "pn_def456"]);
      expect(result.partnerIdOperator).toBe("NOT IN");
    });

    test("returns undefined partnerId when not provided", () => {
      const result = extractWorkspaceLinkFilters({});
      expect(result.partnerId).toBeUndefined();
      expect(result.partnerIdOperator).toBe("IN"); // default
    });

    test("works alongside other workspace link filters", () => {
      const result = extractWorkspaceLinkFilters({
        domain: {
          operator: "IS",
          sqlOperator: "IN",
          values: ["dub.sh"],
        },
        partnerId: {
          operator: "IS_ONE_OF",
          sqlOperator: "IN",
          values: ["pn_abc123", "pn_def456"],
        },
        folderId: {
          operator: "IS_NOT",
          sqlOperator: "NOT IN",
          values: ["fold_xyz"],
        },
      });
      expect(result.domain).toEqual(["dub.sh"]);
      expect(result.domainOperator).toBe("IN");
      expect(result.partnerId).toEqual(["pn_abc123", "pn_def456"]);
      expect(result.partnerIdOperator).toBe("IN");
      expect(result.folderId).toEqual(["fold_xyz"]);
      expect(result.folderIdOperator).toBe("NOT IN");
    });
  });

  describe("extractWorkspaceLinkFilters - groupId", () => {
    test("extracts single groupId with IN operator", () => {
      const result = extractWorkspaceLinkFilters({
        groupId: {
          operator: "IS",
          sqlOperator: "IN",
          values: ["grp_abc123"],
        },
      });
      expect(result.groupId).toEqual(["grp_abc123"]);
      expect(result.groupIdOperator).toBe("IN");
    });

    test("extracts multiple groupIds with IN operator", () => {
      const result = extractWorkspaceLinkFilters({
        groupId: {
          operator: "IS_ONE_OF",
          sqlOperator: "IN",
          values: ["grp_abc123", "grp_def456", "grp_ghi789"],
        },
      });
      expect(result.groupId).toEqual([
        "grp_abc123",
        "grp_def456",
        "grp_ghi789",
      ]);
      expect(result.groupIdOperator).toBe("IN");
    });

    test("extracts single groupId with NOT IN operator", () => {
      const result = extractWorkspaceLinkFilters({
        groupId: {
          operator: "IS_NOT",
          sqlOperator: "NOT IN",
          values: ["grp_abc123"],
        },
      });
      expect(result.groupId).toEqual(["grp_abc123"]);
      expect(result.groupIdOperator).toBe("NOT IN");
    });

    test("extracts multiple groupIds with NOT IN operator", () => {
      const result = extractWorkspaceLinkFilters({
        groupId: {
          operator: "IS_NOT_ONE_OF",
          sqlOperator: "NOT IN",
          values: ["grp_abc123", "grp_def456"],
        },
      });
      expect(result.groupId).toEqual(["grp_abc123", "grp_def456"]);
      expect(result.groupIdOperator).toBe("NOT IN");
    });

    test("returns undefined groupId when not provided", () => {
      const result = extractWorkspaceLinkFilters({});
      expect(result.groupId).toBeUndefined();
      expect(result.groupIdOperator).toBe("IN"); // default
    });

    test("works alongside partnerId and other filters", () => {
      const result = extractWorkspaceLinkFilters({
        partnerId: {
          operator: "IS",
          sqlOperator: "IN",
          values: ["pn_abc123"],
        },
        groupId: {
          operator: "IS_ONE_OF",
          sqlOperator: "IN",
          values: ["grp_abc123", "grp_def456"],
        },
        domain: {
          operator: "IS_NOT",
          sqlOperator: "NOT IN",
          values: ["spam.com"],
        },
      });
      expect(result.partnerId).toEqual(["pn_abc123"]);
      expect(result.partnerIdOperator).toBe("IN");
      expect(result.groupId).toEqual(["grp_abc123", "grp_def456"]);
      expect(result.groupIdOperator).toBe("IN");
      expect(result.domain).toEqual(["spam.com"]);
      expect(result.domainOperator).toBe("NOT IN");
    });
  });

  describe("extractWorkspaceLinkFilters - tenantId", () => {
    test("extracts single tenantId with IN operator", () => {
      const result = extractWorkspaceLinkFilters({
        tenantId: {
          operator: "IS",
          sqlOperator: "IN",
          values: ["tenant_abc123"],
        },
      });
      expect(result.tenantId).toEqual(["tenant_abc123"]);
      expect(result.tenantIdOperator).toBe("IN");
    });

    test("extracts multiple tenantIds with IN operator", () => {
      const result = extractWorkspaceLinkFilters({
        tenantId: {
          operator: "IS_ONE_OF",
          sqlOperator: "IN",
          values: ["tenant_abc", "tenant_def", "tenant_ghi"],
        },
      });
      expect(result.tenantId).toEqual([
        "tenant_abc",
        "tenant_def",
        "tenant_ghi",
      ]);
      expect(result.tenantIdOperator).toBe("IN");
    });

    test("extracts tenantId with NOT IN operator", () => {
      const result = extractWorkspaceLinkFilters({
        tenantId: {
          operator: "IS_NOT_ONE_OF",
          sqlOperator: "NOT IN",
          values: ["tenant_abc", "tenant_def"],
        },
      });
      expect(result.tenantId).toEqual(["tenant_abc", "tenant_def"]);
      expect(result.tenantIdOperator).toBe("NOT IN");
    });

    test("returns undefined tenantId when not provided", () => {
      const result = extractWorkspaceLinkFilters({});
      expect(result.tenantId).toBeUndefined();
      expect(result.tenantIdOperator).toBe("IN");
    });

    test("works alongside all other workspace link filters", () => {
      const result = extractWorkspaceLinkFilters({
        domain: { operator: "IS", sqlOperator: "IN", values: ["dub.sh"] },
        partnerId: { operator: "IS", sqlOperator: "IN", values: ["pn_abc"] },
        groupId: { operator: "IS", sqlOperator: "IN", values: ["grp_abc"] },
        tenantId: {
          operator: "IS_ONE_OF",
          sqlOperator: "IN",
          values: ["t1", "t2"],
        },
        folderId: {
          operator: "IS_NOT",
          sqlOperator: "NOT IN",
          values: ["fold_x"],
        },
      });
      expect(result.domain).toEqual(["dub.sh"]);
      expect(result.partnerId).toEqual(["pn_abc"]);
      expect(result.groupId).toEqual(["grp_abc"]);
      expect(result.tenantId).toEqual(["t1", "t2"]);
      expect(result.tenantIdOperator).toBe("IN");
      expect(result.folderId).toEqual(["fold_x"]);
      expect(result.folderIdOperator).toBe("NOT IN");
    });
  });
});
