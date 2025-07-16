import { evaluateRewardConditions } from "@/lib/partners/evaluate-reward-conditions";
import { RewardContext } from "@/lib/types";
import { describe, expect, test } from "vitest";

describe("evaluateRewardConditions", () => {
  describe("AND operator", () => {
    test("should return true when all conditions are met", () => {
      const conditions = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
          {
            entity: "sale" as const,
            attribute: "productId" as const,
            operator: "equals_to" as const,
            value: "premium",
          },
        ],
      };

      const context: RewardContext = {
        customer: {
          country: "US",
        },
        sale: {
          productId: "premium",
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(true);
    });

    test("should return false when one condition is not met", () => {
      const conditions = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
          {
            entity: "sale" as const,
            attribute: "productId" as const,
            operator: "equals_to" as const,
            value: "premium",
          },
        ],
      };

      const context: RewardContext = {
        customer: {
          country: "US",
        },
        sale: {
          productId: "basic", // Different from expected
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(false);
    });

    test("should return false when all conditions are not met", () => {
      const conditions = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
          {
            entity: "sale" as const,
            attribute: "productId" as const,
            operator: "equals_to" as const,
            value: "premium",
          },
        ],
      };

      const context: RewardContext = {
        customer: {
          country: "CA", // Different from expected
        },
        sale: {
          productId: "basic", // Different from expected
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(false);
    });
  });

  describe("OR operator", () => {
    test("should return true when one condition is met", () => {
      const conditions = {
        operator: "OR" as const,
        amount: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
          {
            entity: "sale" as const,
            attribute: "productId" as const,
            operator: "equals_to" as const,
            value: "premium",
          },
        ],
      };

      const context: RewardContext = {
        customer: {
          country: "US", // This condition is met
        },
        sale: {
          productId: "basic", // This condition is not met
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(true);
    });

    test("should return true when all conditions are met", () => {
      const conditions = {
        operator: "OR" as const,
        amount: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
          {
            entity: "sale" as const,
            attribute: "productId" as const,
            operator: "equals_to" as const,
            value: "premium",
          },
        ],
      };

      const context: RewardContext = {
        customer: {
          country: "US", // This condition is met
        },
        sale: {
          productId: "premium", // This condition is also met
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(true);
    });

    test("should return false when no conditions are met", () => {
      const conditions = {
        operator: "OR" as const,
        amount: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
          {
            entity: "sale" as const,
            attribute: "productId" as const,
            operator: "equals_to" as const,
            value: "premium",
          },
        ],
      };

      const context: RewardContext = {
        customer: {
          country: "CA", // Different from expected
        },
        sale: {
          productId: "basic", // Different from expected
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(false);
    });
  });

  describe("condition operators", () => {
    describe("equals_to", () => {
      test("should match exact string values", () => {
        const conditions = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "customer" as const,
              attribute: "country" as const,
              operator: "equals_to" as const,
              value: "US",
            },
          ],
        };

        const context: RewardContext = {
          customer: {
            country: "US",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(true);
      });

      test("should not match different string values", () => {
        const conditions = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "customer" as const,
              attribute: "country" as const,
              operator: "equals_to" as const,
              value: "US",
            },
          ],
        };

        const context: RewardContext = {
          customer: {
            country: "CA",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(false);
      });
    });

    describe("not_equals", () => {
      test("should match when values are different", () => {
        const conditions = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "customer" as const,
              attribute: "country" as const,
              operator: "not_equals" as const,
              value: "US",
            },
          ],
        };

        const context: RewardContext = {
          customer: {
            country: "CA",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(true);
      });

      test("should not match when values are the same", () => {
        const conditions = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "customer" as const,
              attribute: "country" as const,
              operator: "not_equals" as const,
              value: "US",
            },
          ],
        };

        const context: RewardContext = {
          customer: {
            country: "US",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(false);
      });
    });

    describe("in", () => {
      test("should match when value is in array", () => {
        const conditions = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "customer" as const,
              attribute: "country" as const,
              operator: "in" as const,
              value: ["US", "CA", "UK"],
            },
          ],
        };

        const context: RewardContext = {
          customer: {
            country: "US",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(true);
      });

      test("should not match when value is not in array", () => {
        const conditions = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "customer" as const,
              attribute: "country" as const,
              operator: "in" as const,
              value: ["US", "CA", "UK"],
            },
          ],
        };

        const context: RewardContext = {
          customer: {
            country: "FR",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(false);
      });
    });

    describe("not_in", () => {
      test("should match when value is not in array", () => {
        const conditions = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "customer" as const,
              attribute: "country" as const,
              operator: "not_in" as const,
              value: ["US", "CA", "UK"],
            },
          ],
        };

        const context: RewardContext = {
          customer: {
            country: "FR",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(true);
      });

      test("should not match when value is in array", () => {
        const conditions = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "customer" as const,
              attribute: "country" as const,
              operator: "not_in" as const,
              value: ["US", "CA", "UK"],
            },
          ],
        };

        const context: RewardContext = {
          customer: {
            country: "US",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(false);
      });
    });

    describe("starts_with", () => {
      test("should match when string starts with value", () => {
        const conditions = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "sale" as const,
              attribute: "productId" as const,
              operator: "starts_with" as const,
              value: "premium",
            },
          ],
        };

        const context: RewardContext = {
          sale: {
            productId: "premium-2024",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(true);
      });

      test("should not match when string does not start with value", () => {
        const conditions = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "sale" as const,
              attribute: "productId" as const,
              operator: "starts_with" as const,
              value: "premium",
            },
          ],
        };

        const context: RewardContext = {
          sale: {
            productId: "basic-premium",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(false);
      });
    });

    describe("ends_with", () => {
      test("should match when string ends with value", () => {
        const conditions = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "sale" as const,
              attribute: "productId" as const,
              operator: "ends_with" as const,
              value: "2024",
            },
          ],
        };

        const context: RewardContext = {
          sale: {
            productId: "premium-2024",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(true);
      });

      test("should not match when string does not end with value", () => {
        const conditions = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "sale" as const,
              attribute: "productId" as const,
              operator: "ends_with" as const,
              value: "2024",
            },
          ],
        };

        const context: RewardContext = {
          sale: {
            productId: "2024-premium",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(false);
      });
    });
  });

  describe("edge cases", () => {
    test("should return false when conditions is null", () => {
      const context: RewardContext = {
        customer: {
          country: "US",
        },
      };

      const result = evaluateRewardConditions({
        conditions: null as any,
        context,
      });

      expect(result).toBe(false);
    });

    test("should return false when context is null", () => {
      const conditions = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
        ],
      };

      const result = evaluateRewardConditions({
        conditions,
        context: null as any,
      });

      expect(result).toBe(false);
    });

    test("should return false when field value is undefined", () => {
      const conditions = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
        ],
      };

      const context: RewardContext = {
        customer: {
          country: null, // Field value is null/undefined
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(false);
    });

    test("should return false when customer object is missing", () => {
      const conditions = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
        ],
      };

      const context: RewardContext = {
        // customer object is missing
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(false);
    });

    test("should return false when sale object is missing", () => {
      const conditions = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            entity: "sale" as const,
            attribute: "productId" as const,
            operator: "equals_to" as const,
            value: "premium",
          },
        ],
      };

      const context: RewardContext = {
        // sale object is missing
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(false);
    });
  });

  describe("complex scenarios", () => {
    test("should handle multiple conditions with mixed operators", () => {
      const conditions = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "country" as const,
            operator: "in" as const,
            value: ["US", "CA", "UK"],
          },
          {
            entity: "sale" as const,
            attribute: "productId" as const,
            operator: "starts_with" as const,
            value: "premium",
          },
        ],
      };

      const context: RewardContext = {
        customer: {
          country: "US",
        },
        sale: {
          productId: "premium-2024",
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(true);
    });

    test("should handle OR with multiple conditions where only one is true", () => {
      const conditions = {
        operator: "OR" as const,
        amount: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "country" as const,
            operator: "equals_to" as const,
            value: "FR", // This will be false
          },
          {
            entity: "sale" as const,
            attribute: "productId" as const,
            operator: "equals_to" as const,
            value: "premium", // This will be true
          },
        ],
      };

      const context: RewardContext = {
        customer: {
          country: "US", // Different from first condition
        },
        sale: {
          productId: "premium", // Matches second condition
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(true);
    });
  });
});
