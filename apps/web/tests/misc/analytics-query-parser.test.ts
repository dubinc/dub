import { parseFiltersFromQuery } from "@/lib/analytics/utils/analytics-query-parser";
import { describe, expect, it } from "vitest";

describe("Analytics Query Parser", () => {
  describe("parseFiltersFromQuery", () => {
    describe("basic fields", () => {
      it("should parse simple field", () => {
        const result = parseFiltersFromQuery("amount:100");
        expect(result).toEqual([
          { operand: "amount", operator: "=", value: "100" },
        ]);
      });

      it("should parse field with underscore", () => {
        const result = parseFiltersFromQuery("user_id:123");
        expect(result).toEqual([
          { operand: "user_id", operator: "=", value: "123" },
        ]);
      });

      it("should parse field with numbers", () => {
        const result = parseFiltersFromQuery("field123:value");
        expect(result).toEqual([
          { operand: "field123", operator: "=", value: "value" },
        ]);
      });

      it("should parse field with quoted value", () => {
        const result = parseFiltersFromQuery("email:'john@example.com'");
        expect(result).toEqual([
          { operand: "email", operator: "=", value: "john@example.com" },
        ]);
      });

      it("should parse field with double quoted value", () => {
        const result = parseFiltersFromQuery('status:"active"');
        expect(result).toEqual([
          { operand: "status", operator: "=", value: "active" },
        ]);
      });

      it("should parse field with backtick quoted value", () => {
        const result = parseFiltersFromQuery("description:`quoted value`");
        expect(result).toEqual([
          { operand: "description", operator: "=", value: "quoted value" },
        ]);
      });
    });

    describe("nested properties", () => {
      it("should parse simple nested property", () => {
        const result = parseFiltersFromQuery("metadata['key']:value");
        expect(result).toEqual([
          { operand: "key", operator: "=", value: "value" },
        ]);
      });

      it("should parse nested property with double quotes", () => {
        const result = parseFiltersFromQuery('metadata["key"]:"quoted value"');
        expect(result).toEqual([
          { operand: "key", operator: "=", value: "quoted value" },
        ]);
      });

      it("should parse deeply nested property", () => {
        const result = parseFiltersFromQuery(
          "metadata['level1']['level2']['level3']:value",
        );
        expect(result).toEqual([
          { operand: "level1.level2.level3", operator: "=", value: "value" },
        ]);
      });

      it("should parse nested property with complex path", () => {
        const result = parseFiltersFromQuery(
          "metadata['user']['preferences']['theme']:dark",
        );
        expect(result).toEqual([
          { operand: "user.preferences.theme", operator: "=", value: "dark" },
        ]);
      });
    });

    describe("operators", () => {
      it("should parse equals operator (:) for regular field", () => {
        const result = parseFiltersFromQuery("amount:100");
        expect(result).toEqual([
          { operand: "amount", operator: "=", value: "100" },
        ]);
      });

      it("should parse equals operator (:) for nested property", () => {
        const result = parseFiltersFromQuery("metadata['key']:value");
        expect(result).toEqual([
          { operand: "key", operator: "=", value: "value" },
        ]);
      });

      it("should parse greater than operator", () => {
        const result = parseFiltersFromQuery("amount>50");
        expect(result).toEqual([
          { operand: "amount", operator: ">", value: "50" },
        ]);
      });

      it("should parse less than operator", () => {
        const result = parseFiltersFromQuery("amount<100");
        expect(result).toEqual([
          { operand: "amount", operator: "<", value: "100" },
        ]);
      });

      it("should parse greater than or equal operator", () => {
        const result = parseFiltersFromQuery("amount>=100");
        expect(result).toEqual([
          { operand: "amount", operator: ">=", value: "100" },
        ]);
      });

      it("should parse less than or equal operator", () => {
        const result = parseFiltersFromQuery("amount<=50");
        expect(result).toEqual([
          { operand: "amount", operator: "<=", value: "50" },
        ]);
      });

      it("should parse not equals operator", () => {
        const result = parseFiltersFromQuery("status!=completed");
        expect(result).toEqual([
          { operand: "status", operator: "!=", value: "completed" },
        ]);
      });

      it("should parse not equals operator for nested property", () => {
        const result = parseFiltersFromQuery("metadata['status']!=completed");
        expect(result).toEqual([
          { operand: "status", operator: "!=", value: "completed" },
        ]);
      });
    });

    describe("multiple conditions", () => {
      it("should parse multiple conditions with AND", () => {
        const result = parseFiltersFromQuery("amount>=100 AND status:pending");
        expect(result).toEqual([
          { operand: "amount", operator: ">=", value: "100" },
          { operand: "status", operator: "=", value: "pending" },
        ]);
      });

      it("should parse multiple conditions with OR", () => {
        const result = parseFiltersFromQuery("status:active OR status:pending");
        expect(result).toEqual([
          { operand: "status", operator: "=", value: "active" },
          { operand: "status", operator: "=", value: "pending" },
        ]);
      });

      it("should parse multiple conditions with mixed AND/OR", () => {
        const result = parseFiltersFromQuery(
          "amount>100 AND status:active OR email:test@example.com",
        );
        expect(result).toEqual([
          { operand: "amount", operator: ">", value: "100" },
          { operand: "status", operator: "=", value: "active" },
          { operand: "email", operator: "=", value: "test@example.com" },
        ]);
      });

      it("should parse multiple nested property conditions", () => {
        const result = parseFiltersFromQuery(
          "metadata['product_id']:123 AND metadata['category']:electronics",
        );
        expect(result).toEqual([
          { operand: "product_id", operator: "=", value: "123" },
          { operand: "category", operator: "=", value: "electronics" },
        ]);
      });

      it("should parse mixed nested and regular field conditions", () => {
        const result = parseFiltersFromQuery(
          "amount>100 AND metadata['user_type']:premium",
        );
        expect(result).toEqual([
          { operand: "amount", operator: ">", value: "100" },
          { operand: "user_type", operator: "=", value: "premium" },
        ]);
      });
    });

    describe("edge cases", () => {
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

      it("should handle invalid field names", () => {
        const result = parseFiltersFromQuery("123field:value");
        expect(result).toBeUndefined();
      });

      it("should handle invalid operators", () => {
        const result = parseFiltersFromQuery("field==value");
        expect(result).toEqual([
          { operand: "field", operator: "=", value: "value" },
        ]);
      });

      it("should handle extra whitespace", () => {
        const result = parseFiltersFromQuery("  amount  :  100  ");
        expect(result).toEqual([
          { operand: "amount", operator: "=", value: "100" },
        ]);
      });

      it("should handle numeric values", () => {
        const result = parseFiltersFromQuery("amount:123.45");
        expect(result).toEqual([
          { operand: "amount", operator: "=", value: "123.45" },
        ]);
      });

      it("should handle boolean values", () => {
        const result = parseFiltersFromQuery("active:true");
        expect(result).toEqual([
          { operand: "active", operator: "=", value: "true" },
        ]);
      });

      it("should handle special characters in values", () => {
        const result = parseFiltersFromQuery(
          "description:'Hello, World! @#$%'",
        );
        expect(result).toEqual([
          {
            operand: "description",
            operator: "=",
            value: "Hello, World! @#$%",
          },
        ]);
      });
    });

    describe("real-world examples", () => {
      it("should parse e-commerce filter", () => {
        const result = parseFiltersFromQuery(
          "amount>=100 AND metadata['category']:electronics AND status:completed",
        );
        expect(result).toEqual([
          { operand: "amount", operator: ">=", value: "100" },
          { operand: "category", operator: "=", value: "electronics" },
          { operand: "status", operator: "=", value: "completed" },
        ]);
      });

      it("should parse user analytics filter", () => {
        const result = parseFiltersFromQuery(
          "metadata['user_type']:premium AND metadata['region']:us AND amount>50",
        );
        expect(result).toEqual([
          { operand: "user_type", operator: "=", value: "premium" },
          { operand: "region", operator: "=", value: "us" },
          { operand: "amount", operator: ">", value: "50" },
        ]);
      });

      it("should parse lead generation filter", () => {
        const result = parseFiltersFromQuery(
          "metadata['source']:website AND metadata['campaign']:summer2024 AND status:qualified",
        );
        expect(result).toEqual([
          { operand: "source", operator: "=", value: "website" },
          { operand: "campaign", operator: "=", value: "summer2024" },
          { operand: "status", operator: "=", value: "qualified" },
        ]);
      });
    });
  });
});
