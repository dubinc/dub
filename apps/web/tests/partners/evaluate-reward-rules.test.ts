import { evaluateRewardRules } from "@/lib/partners/evaluate-reward-rules";
import { rewardContextSchema } from "@/lib/zod/schemas/rewards";
import { describe, expect, test } from "vitest";
import { z } from "zod";

type RewardContext = z.infer<typeof rewardContextSchema>;

describe("evaluateRewardRules", () => {
  describe("AND operator", () => {
    test("should return amount when all conditions are met", () => {
      const modifier = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            type: "customer" as const,
            field: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
          {
            type: "sale" as const,
            field: "productId" as const,
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

      const result = evaluateRewardRules({ modifier, context });
      expect(result).toBe(5000);
    });

    test("should return null when one condition is not met", () => {
      const modifier = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            type: "customer" as const,
            field: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
          {
            type: "sale" as const,
            field: "productId" as const,
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

      const result = evaluateRewardRules({ modifier, context });
      expect(result).toBeNull();
    });

    test("should return null when all conditions are not met", () => {
      const modifier = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            type: "customer" as const,
            field: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
          {
            type: "sale" as const,
            field: "productId" as const,
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

      const result = evaluateRewardRules({ modifier, context });
      expect(result).toBeNull();
    });
  });

  describe("OR operator", () => {
    test("should return amount when one condition is met", () => {
      const modifier = {
        operator: "OR" as const,
        amount: 5000,
        conditions: [
          {
            type: "customer" as const,
            field: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
          {
            type: "sale" as const,
            field: "productId" as const,
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

      const result = evaluateRewardRules({ modifier, context });
      expect(result).toBe(5000);
    });

    test("should return amount when all conditions are met", () => {
      const modifier = {
        operator: "OR" as const,
        amount: 5000,
        conditions: [
          {
            type: "customer" as const,
            field: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
          {
            type: "sale" as const,
            field: "productId" as const,
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

      const result = evaluateRewardRules({ modifier, context });
      expect(result).toBe(5000);
    });

    test("should return null when no conditions are met", () => {
      const modifier = {
        operator: "OR" as const,
        amount: 5000,
        conditions: [
          {
            type: "customer" as const,
            field: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
          {
            type: "sale" as const,
            field: "productId" as const,
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

      const result = evaluateRewardRules({ modifier, context });
      expect(result).toBeNull();
    });
  });

  describe("condition operators", () => {
    describe("equals_to", () => {
      test("should match exact string values", () => {
        const modifier = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              type: "customer" as const,
              field: "country" as const,
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

        const result = evaluateRewardRules({ modifier, context });
        expect(result).toBe(5000);
      });

      test("should not match different string values", () => {
        const modifier = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              type: "customer" as const,
              field: "country" as const,
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

        const result = evaluateRewardRules({ modifier, context });
        expect(result).toBeNull();
      });
    });

    describe("not_equals", () => {
      test("should match when values are different", () => {
        const modifier = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              type: "customer" as const,
              field: "country" as const,
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

        const result = evaluateRewardRules({ modifier, context });
        expect(result).toBe(5000);
      });

      test("should not match when values are the same", () => {
        const modifier = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              type: "customer" as const,
              field: "country" as const,
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

        const result = evaluateRewardRules({ modifier, context });
        expect(result).toBeNull();
      });
    });

    describe("in", () => {
      test("should match when value is in array", () => {
        const modifier = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              type: "customer" as const,
              field: "country" as const,
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

        const result = evaluateRewardRules({ modifier, context });
        expect(result).toBe(5000);
      });

      test("should not match when value is not in array", () => {
        const modifier = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              type: "customer" as const,
              field: "country" as const,
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

        const result = evaluateRewardRules({ modifier, context });
        expect(result).toBeNull();
      });
    });

    describe("not_in", () => {
      test("should match when value is not in array", () => {
        const modifier = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              type: "customer" as const,
              field: "country" as const,
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

        const result = evaluateRewardRules({ modifier, context });
        expect(result).toBe(5000);
      });

      test("should not match when value is in array", () => {
        const modifier = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              type: "customer" as const,
              field: "country" as const,
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

        const result = evaluateRewardRules({ modifier, context });
        expect(result).toBeNull();
      });
    });

    describe("starts_with", () => {
      test("should match when string starts with value", () => {
        const modifier = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              type: "sale" as const,
              field: "productId" as const,
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

        const result = evaluateRewardRules({ modifier, context });
        expect(result).toBe(5000);
      });

      test("should not match when string does not start with value", () => {
        const modifier = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              type: "sale" as const,
              field: "productId" as const,
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

        const result = evaluateRewardRules({ modifier, context });
        expect(result).toBeNull();
      });
    });

    describe("ends_with", () => {
      test("should match when string ends with value", () => {
        const modifier = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              type: "sale" as const,
              field: "productId" as const,
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

        const result = evaluateRewardRules({ modifier, context });
        expect(result).toBe(5000);
      });

      test("should not match when string does not end with value", () => {
        const modifier = {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              type: "sale" as const,
              field: "productId" as const,
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

        const result = evaluateRewardRules({ modifier, context });
        expect(result).toBeNull();
      });
    });
  });

  describe("edge cases", () => {
    test("should return null when modifier is null", () => {
      const context: RewardContext = {
        customer: {
          country: "US",
        },
      };

      const result = evaluateRewardRules({ modifier: null, context });
      expect(result).toBeNull();
    });

    test("should return null when context is null", () => {
      const modifier = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            type: "customer" as const,
            field: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
        ],
      };

      const result = evaluateRewardRules({ modifier, context: null as any });
      expect(result).toBeNull();
    });

    test("should return null when field value is undefined", () => {
      const modifier = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            type: "customer" as const,
            field: "country" as const,
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

      const result = evaluateRewardRules({ modifier, context });
      expect(result).toBeNull();
    });

    test("should return null when customer object is missing", () => {
      const modifier = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            type: "customer" as const,
            field: "country" as const,
            operator: "equals_to" as const,
            value: "US",
          },
        ],
      };

      const context: RewardContext = {
        // customer object is missing
      };

      const result = evaluateRewardRules({ modifier, context });
      expect(result).toBeNull();
    });

    test("should return null when sale object is missing", () => {
      const modifier = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            type: "sale" as const,
            field: "productId" as const,
            operator: "equals_to" as const,
            value: "premium",
          },
        ],
      };

      const context: RewardContext = {
        // sale object is missing
      };

      const result = evaluateRewardRules({ modifier, context });
      expect(result).toBeNull();
    });
  });

  describe("complex scenarios", () => {
    test("should handle multiple conditions with mixed operators", () => {
      const modifier = {
        operator: "AND" as const,
        amount: 5000,
        conditions: [
          {
            type: "customer" as const,
            field: "country" as const,
            operator: "in" as const,
            value: ["US", "CA", "UK"],
          },
          {
            type: "sale" as const,
            field: "productId" as const,
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

      const result = evaluateRewardRules({ modifier, context });
      expect(result).toBe(5000);
    });

    test("should handle OR with multiple conditions where only one is true", () => {
      const modifier = {
        operator: "OR" as const,
        amount: 5000,
        conditions: [
          {
            type: "customer" as const,
            field: "country" as const,
            operator: "equals_to" as const,
            value: "FR", // This will be false
          },
          {
            type: "sale" as const,
            field: "productId" as const,
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

      const result = evaluateRewardRules({ modifier, context });
      expect(result).toBe(5000);
    });
  });
});
