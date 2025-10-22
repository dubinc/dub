import { evaluateRewardConditions } from "@/lib/partners/evaluate-reward-conditions";
import { RewardContext } from "@/lib/types";
import { describe, expect, test } from "vitest";

describe("evaluateRewardConditions", () => {
  describe("AND operator", () => {
    test("should return matching condition when all conditions are met", () => {
      const conditions = [
        {
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
        },
      ];

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
      const conditions = [
        {
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
        },
      ];

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
      const conditions = [
        {
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
        },
      ];

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
      const conditions = [
        {
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
        },
      ];

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
      const conditions = [
        {
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
        },
      ];

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
      const conditions = [
        {
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
        },
      ];

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
        const conditions = [
          {
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
          },
        ];

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
        const conditions = [
          {
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
          },
        ];

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
        const conditions = [
          {
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
          },
        ];

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
        const conditions = [
          {
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
          },
        ];

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
        const conditions = [
          {
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
          },
        ];

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
        const conditions = [
          {
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
          },
        ];

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
        const conditions = [
          {
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
          },
        ];

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
        const conditions = [
          {
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
          },
        ];

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
        const conditions = [
          {
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
          },
        ];

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
        const conditions = [
          {
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
          },
        ];

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
        const conditions = [
          {
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
          },
        ];

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
        const conditions = [
          {
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
          },
        ];

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

    describe("greater_than", () => {
      test("should match when numeric value is greater than condition value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amount: 5000,
            conditions: [
              {
                entity: "partner" as const,
                attribute: "totalClicks" as const,
                operator: "greater_than" as const,
                value: 100,
              },
            ],
          },
        ];

        const context: RewardContext = {
          partner: {
            totalClicks: 150,
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toEqual(conditions[0]);
      });

      test("should not match when numeric value is equal to condition value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amount: 5000,
            conditions: [
              {
                entity: "partner" as const,
                attribute: "totalClicks" as const,
                operator: "greater_than" as const,
                value: 100,
              },
            ],
          },
        ];

        const context: RewardContext = {
          partner: {
            totalClicks: 100,
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(null);
      });

      test("should not match when numeric value is less than condition value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amount: 5000,
            conditions: [
              {
                entity: "partner" as const,
                attribute: "totalClicks" as const,
                operator: "greater_than" as const,
                value: 100,
              },
            ],
          },
        ];

        const context: RewardContext = {
          partner: {
            totalClicks: 50,
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(null);
      });
    });

    describe("greater_than_or_equal", () => {
      test("should match when numeric value is greater than condition value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amount: 5000,
            conditions: [
              {
                entity: "partner" as const,
                attribute: "totalLeads" as const,
                operator: "greater_than_or_equal" as const,
                value: 50,
              },
            ],
          },
        ];

        const context: RewardContext = {
          partner: {
            totalLeads: 75,
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toEqual(conditions[0]);
      });

      test("should match when numeric value is equal to condition value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amount: 5000,
            conditions: [
              {
                entity: "partner" as const,
                attribute: "totalLeads" as const,
                operator: "greater_than_or_equal" as const,
                value: 50,
              },
            ],
          },
        ];

        const context: RewardContext = {
          partner: {
            totalLeads: 50,
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toEqual(conditions[0]);
      });

      test("should not match when numeric value is less than condition value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amount: 5000,
            conditions: [
              {
                entity: "partner" as const,
                attribute: "totalLeads" as const,
                operator: "greater_than_or_equal" as const,
                value: 50,
              },
            ],
          },
        ];

        const context: RewardContext = {
          partner: {
            totalLeads: 25,
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(null);
      });
    });

    describe("less_than", () => {
      test("should match when numeric value is less than condition value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amount: 5000,
            conditions: [
              {
                entity: "partner" as const,
                attribute: "totalConversions" as const,
                operator: "less_than" as const,
                value: 10,
              },
            ],
          },
        ];

        const context: RewardContext = {
          partner: {
            totalConversions: 5,
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toEqual(conditions[0]);
      });

      test("should not match when numeric value is equal to condition value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amount: 5000,
            conditions: [
              {
                entity: "partner" as const,
                attribute: "totalConversions" as const,
                operator: "less_than" as const,
                value: 10,
              },
            ],
          },
        ];

        const context: RewardContext = {
          partner: {
            totalConversions: 10,
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(null);
      });

      test("should not match when numeric value is greater than condition value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amount: 5000,
            conditions: [
              {
                entity: "partner" as const,
                attribute: "totalConversions" as const,
                operator: "less_than" as const,
                value: 10,
              },
            ],
          },
        ];

        const context: RewardContext = {
          partner: {
            totalConversions: 15,
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toBe(null);
      });
    });

    describe("less_than_or_equal", () => {
      test("should match when numeric value is less than condition value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amount: 5000,
            conditions: [
              {
                entity: "partner" as const,
                attribute: "totalSaleAmount" as const,
                operator: "less_than_or_equal" as const,
                value: 1000,
              },
            ],
          },
        ];

        const context: RewardContext = {
          partner: {
            totalSaleAmount: 750,
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toEqual(conditions[0]);
      });

      test("should match when numeric value is equal to condition value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amount: 5000,
            conditions: [
              {
                entity: "partner" as const,
                attribute: "totalSaleAmount" as const,
                operator: "less_than_or_equal" as const,
                value: 1000,
              },
            ],
          },
        ];

        const context: RewardContext = {
          partner: {
            totalSaleAmount: 1000,
          },
        };

        const result = evaluateRewardConditions({
          conditions,
          context,
        });

        expect(result).toEqual(conditions[0]);
      });

      test("should not match when numeric value is greater than condition value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amount: 5000,
            conditions: [
              {
                entity: "partner" as const,
                attribute: "totalSaleAmount" as const,
                operator: "less_than_or_equal" as const,
                value: 1000,
              },
            ],
          },
        ];

        const context: RewardContext = {
          partner: {
            totalSaleAmount: 1250,
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
      const conditions = [
        {
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
        },
      ];

      const result = evaluateRewardConditions({
        conditions,
        context: null as any,
      });

      expect(result).toBe(null);
    });

    test("should return null when field value is undefined", () => {
      const conditions = [
        {
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
        },
      ];

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

    test("should handle numeric operators with string values (type coercion)", () => {
      const conditions = [
        {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "partner" as const,
              attribute: "totalClicks" as const,
              operator: "greater_than" as const,
              value: "100", // String value that should be coerced to number
            },
          ],
        },
      ];

      const context: RewardContext = {
        partner: {
          totalClicks: 150,
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toEqual(conditions[0]);
    });

    test("should handle string field values with numeric operators (type coercion)", () => {
      const conditions = [
        {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "partner" as const,
              attribute: "totalCommissions" as const,
              operator: "less_than_or_equal" as const,
              value: 500,
            },
          ],
        },
      ];

      const context: RewardContext = {
        partner: {
          totalCommissions: 300, // Should work with Number() conversion
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toEqual(conditions[0]);
    });

    test("should handle decimal numbers with numeric operators", () => {
      const conditions = [
        {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "partner" as const,
              attribute: "totalSaleAmount" as const,
              operator: "greater_than_or_equal" as const,
              value: 999.99,
            },
          ],
        },
      ];

      const context: RewardContext = {
        partner: {
          totalSaleAmount: 1000.0,
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toEqual(conditions[0]);
    });

    test("should handle zero values with numeric operators", () => {
      const conditions = [
        {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "partner" as const,
              attribute: "totalClicks" as const,
              operator: "greater_than" as const,
              value: 0,
            },
          ],
        },
      ];

      const context: RewardContext = {
        partner: {
          totalClicks: 0,
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(null); // 0 is not greater than 0
    });

    test("should handle negative numbers with numeric operators", () => {
      const conditions = [
        {
          operator: "AND" as const,
          amount: 5000,
          conditions: [
            {
              entity: "partner" as const,
              attribute: "totalCommissions" as const,
              operator: "greater_than" as const,
              value: -100,
            },
          ],
        },
      ];

      const context: RewardContext = {
        partner: {
          totalCommissions: 50,
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toEqual(conditions[0]);
    });
  });

  describe("mixed condition scenarios", () => {
    test("should handle mixed string and numeric operators in AND condition", () => {
      const conditions = [
        {
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
              entity: "partner" as const,
              attribute: "totalClicks" as const,
              operator: "greater_than" as const,
              value: 100,
            },
            {
              entity: "partner" as const,
              attribute: "totalSaleAmount" as const,
              operator: "less_than_or_equal" as const,
              value: 10000,
            },
          ],
        },
      ];

      const context: RewardContext = {
        customer: {
          country: "US",
        },
        partner: {
          totalClicks: 150,
          totalSaleAmount: 8500,
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toEqual(conditions[0]);
    });

    test("should fail when one numeric condition in AND group fails", () => {
      const conditions = [
        {
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
              entity: "partner" as const,
              attribute: "totalClicks" as const,
              operator: "greater_than" as const,
              value: 100,
            },
            {
              entity: "partner" as const,
              attribute: "totalSaleAmount" as const,
              operator: "less_than" as const,
              value: 5000, // This will fail
            },
          ],
        },
      ];

      const context: RewardContext = {
        customer: {
          country: "US",
        },
        partner: {
          totalClicks: 150,
          totalSaleAmount: 8500, // Greater than 5000
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBe(null);
    });

    test("should succeed when one numeric condition in OR group succeeds", () => {
      const conditions = [
        {
          operator: "OR" as const,
          amount: 5000,
          conditions: [
            {
              entity: "partner" as const,
              attribute: "totalClicks" as const,
              operator: "greater_than" as const,
              value: 1000, // This will fail
            },
            {
              entity: "partner" as const,
              attribute: "totalLeads" as const,
              operator: "greater_than_or_equal" as const,
              value: 50, // This will succeed
            },
            {
              entity: "partner" as const,
              attribute: "totalSaleAmount" as const,
              operator: "less_than" as const,
              value: 1000, // This will fail
            },
          ],
        },
      ];

      const context: RewardContext = {
        partner: {
          totalClicks: 100, // Less than 1000
          totalLeads: 75, // Greater than or equal to 50
          totalSaleAmount: 5000, // Greater than 1000
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toEqual(conditions[0]);
    });

    test("should return highest amount when multiple condition groups with numeric operators match", () => {
      const conditions = [
        {
          operator: "AND" as const,
          amount: 1000,
          conditions: [
            {
              entity: "partner" as const,
              attribute: "totalClicks" as const,
              operator: "greater_than" as const,
              value: 10,
            },
          ],
        },
        {
          operator: "AND" as const,
          amount: 3000, // Highest amount
          conditions: [
            {
              entity: "partner" as const,
              attribute: "totalLeads" as const,
              operator: "greater_than_or_equal" as const,
              value: 5,
            },
          ],
        },
        {
          operator: "AND" as const,
          amount: 2000,
          conditions: [
            {
              entity: "partner" as const,
              attribute: "totalConversions" as const,
              operator: "less_than_or_equal" as const,
              value: 100,
            },
          ],
        },
      ];

      const context: RewardContext = {
        partner: {
          totalClicks: 50, // > 10
          totalLeads: 20, // >= 5
          totalConversions: 25, // <= 100
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toEqual(conditions[1]); // Should return the highest amount (3000)
    });
  });

  describe("partner country conditions", () => {
    test("should match partner country condition", () => {
      const conditions = [
        {
          operator: "AND" as const,
          amount: 1000,
          conditions: [
            {
              entity: "partner" as const,
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
              entity: "partner" as const,
              attribute: "country" as const,
              operator: "equals_to" as const,
              value: "CA",
            },
          ],
        },
      ];

      const context: RewardContext = {
        partner: {
          country: "US",
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toEqual(conditions[0]); // Should return the US condition
    });

    test("should match partner country with multiple countries", () => {
      const conditions = [
        {
          operator: "AND" as const,
          amount: 1500,
          conditions: [
            {
              entity: "partner" as const,
              attribute: "country" as const,
              operator: "in" as const,
              value: ["US", "CA", "UK"],
            },
          ],
        },
      ];

      const context: RewardContext = {
        partner: {
          country: "CA",
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toEqual(conditions[0]); // Should match CA
    });

    test("should not match when partner country does not match", () => {
      const conditions = [
        {
          operator: "AND" as const,
          amount: 1000,
          conditions: [
            {
              entity: "partner" as const,
              attribute: "country" as const,
              operator: "equals_to" as const,
              value: "US",
            },
          ],
        },
      ];

      const context: RewardContext = {
        partner: {
          country: "CA",
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBeNull(); // Should not match
    });

    test("should handle null partner country", () => {
      const conditions = [
        {
          operator: "AND" as const,
          amount: 1000,
          conditions: [
            {
              entity: "partner" as const,
              attribute: "country" as const,
              operator: "equals_to" as const,
              value: "US",
            },
          ],
        },
      ];

      const context: RewardContext = {
        partner: {
          country: null,
        },
      };

      const result = evaluateRewardConditions({
        conditions,
        context,
      });

      expect(result).toBeNull(); // Should not match when country is null
    });
  });
});
