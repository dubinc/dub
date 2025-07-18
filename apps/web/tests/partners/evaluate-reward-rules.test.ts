import { evaluateRewardConditions, RewardContext } from "@/lib/partners/evaluate-reward-conditions";
import { describe, expect, test } from "vitest";

describe("evaluateRewardConditions", () => {
  describe("AND operator", () => {
    test("should return matching condition when all conditions are met", () => {
      const conditions = [{
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
      }];

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

      expect(result).toEqual(conditions[0]);
    });

    test("should return null when one condition is not met", () => {
      const conditions = [{
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
      }];

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

      expect(result).toBe(null);
    });

    test("should return null when all conditions are not met", () => {
      const conditions = [{
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
      }];

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

      expect(result).toBe(null);
    });
  });

  describe("OR operator", () => {
    test("should return matching condition when one condition is met", () => {
      const conditions = [{
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
      }];

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

      expect(result).toEqual(conditions[0]);
    });

    test("should return matching condition when all conditions are met", () => {
      const conditions = [{
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
      }];

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

      expect(result).toEqual(conditions[0]);
    });

    test("should return null when no conditions are met", () => {
      const conditions = [{
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
      }];

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

      expect(result).toBe(null);
    });
  });

  describe("multiple condition groups", () => {
    test("should return first matching condition group", () => {
      const conditions = [
        {
          operator: "AND" as const,
          amount: 1000,
          conditions: [
            {
              entity: "customer" as const,
              attribute: "country" as const,
              operator: "equals_to" as const,
              value: "US",
            },
          ],
        },
        {
          operator: "AND" as const,
          amount: 2000,
          conditions: [
            {
              entity: "customer" as const,
              attribute: "country" as const,
              operator: "equals_to" as const,
              value: "CA",
            },
          ],
        },
        {
          operator: "AND" as const,
          amount: 3000,
          conditions: [
            {
              entity: "customer" as const,
              attribute: "country" as const,
              operator: "equals_to" as const,
              value: "UK",
            },
          ],
        },
      ];

      const context: RewardContext = {
        customer: {
          country: "CA", // This should match the second condition group
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toEqual(conditions[1]); // Should return the second condition group
    });

    test("should return null when no condition groups match", () => {
      const conditions = [
        {
          operator: "AND" as const,
          amount: 1000,
          conditions: [
            {
              entity: "customer" as const,
              attribute: "country" as const,
              operator: "equals_to" as const,
              value: "US",
            },
          ],
        },
        {
          operator: "AND" as const,
          amount: 2000,
          conditions: [
            {
              entity: "customer" as const,
              attribute: "country" as const,
              operator: "equals_to" as const,
              value: "CA",
            },
          ],
        },
      ];

      const context: RewardContext = {
        customer: {
          country: "UK", // Doesn't match any condition group
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(null);
    });
  });

  describe("condition operators", () => {
    describe("equals_to", () => {
      test("should match exact string values", () => {
        const conditions = [{
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
        }];

        const context: RewardContext = {
          customer: {
            country: "US",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toEqual(conditions[0]);
      });

      test("should not match different string values", () => {
        const conditions = [{
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
        }];

        const context: RewardContext = {
          customer: {
            country: "CA",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(null);
      });
    });

    describe("not_equals", () => {
      test("should match when values are different", () => {
        const conditions = [{
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
        }];

        const context: RewardContext = {
          customer: {
            country: "CA",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toEqual(conditions[0]);
      });

      test("should not match when values are the same", () => {
        const conditions = [{
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
        }];

        const context: RewardContext = {
          customer: {
            country: "US",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(null);
      });
    });

    describe("in", () => {
      test("should match when value is in array", () => {
        const conditions = [{
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
        }];

        const context: RewardContext = {
          customer: {
            country: "CA",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toEqual(conditions[0]);
      });

      test("should not match when value is not in array", () => {
        const conditions = [{
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
        }];

        const context: RewardContext = {
          customer: {
            country: "FR",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(null);
      });
    });

    describe("not_in", () => {
      test("should match when value is not in array", () => {
        const conditions = [{
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
        }];

        const context: RewardContext = {
          customer: {
            country: "FR",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toEqual(conditions[0]);
      });

      test("should not match when value is in array", () => {
        const conditions = [{
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
        }];

        const context: RewardContext = {
          customer: {
            country: "US",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(null);
      });
    });

    describe("starts_with", () => {
      test("should match when string starts with value", () => {
        const conditions = [{
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
        }];

        const context: RewardContext = {
          sale: {
            productId: "premium-plus",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toEqual(conditions[0]);
      });

      test("should not match when string does not start with value", () => {
        const conditions = [{
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
        }];

        const context: RewardContext = {
          sale: {
            productId: "basic-plus",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(null);
      });
    });

    describe("ends_with", () => {
      test("should match when string ends with value", () => {
        const conditions = [{
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "sale" as const,
              attribute: "productId" as const,
              operator: "ends_with" as const,
              value: "plus",
            },
          ],
        }];

        const context: RewardContext = {
          sale: {
            productId: "premium-plus",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toEqual(conditions[0]);
      });

      test("should not match when string does not end with value", () => {
        const conditions = [{
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "sale" as const,
              attribute: "productId" as const,
              operator: "ends_with" as const,
              value: "plus",
            },
          ],
        }];

        const context: RewardContext = {
          sale: {
            productId: "premium-basic",
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(null);
      });
    });
  });

  describe("edge cases", () => {
    test("should return null when conditions array is empty", () => {
      const conditions: any[] = [];

      const context: RewardContext = {
        customer: {
          country: "US",
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(null);
    });

    test("should return null when context is null", () => {
      const conditions = [{
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
      }];

      const result = evaluateRewardConditions({
        conditions,
        context: null as any,
      });

      expect(result).toBe(null);
    });

    test("should return null when field value is undefined", () => {
      const conditions = [{
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
      }];

      const context: RewardContext = {
        customer: {
          // country is undefined
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(null);
    });
  });
});
