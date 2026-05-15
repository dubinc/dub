import { evaluateRewardConditions } from "@/lib/partners/evaluate-reward-conditions";
import { RewardContext } from "@/lib/types";
import { rewardConditionSchema } from "@/lib/zod/schemas/rewards";
import { describe, expect, test } from "vitest";

describe("evaluateRewardConditions", () => {
  describe("AND operator", () => {
    test("should return matching condition when all conditions are met", () => {
      const conditions = [
        {
          operator: "AND" as const,
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 1000,
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
          type: "flat" as const,
          amountInCents: 2000,
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
          type: "flat" as const,
          amountInCents: 3000,
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
          type: "flat" as const,
          amountInCents: 1000,
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
          type: "flat" as const,
          amountInCents: 2000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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

      test("should not match when condition value is an empty array", () => {
        expect(
          evaluateRewardConditions({
            conditions: [
              {
                operator: "AND" as const,
                amountInCents: 5000,
                conditions: [
                  {
                    entity: "customer" as const,
                    attribute: "country" as const,
                    operator: "not_in" as const,
                    value: [],
                  },
                ],
              },
            ],
            context: { customer: { country: "FR" } },
          }),
        ).toBe(null);
      });

      test("should not match when condition value is not an array", () => {
        expect(
          evaluateRewardConditions({
            conditions: [
              {
                operator: "AND" as const,
                amountInCents: 5000,
                conditions: [
                  {
                    entity: "customer" as const,
                    attribute: "country" as const,
                    operator: "not_in" as const,
                    value: "US",
                  },
                ],
              },
            ],
            context: { customer: { country: "FR" } },
          }),
        ).toBe(null);
      });
    });

    describe("contains", () => {
      test("should match when field contains the substring", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amountInCents: 5000,
            conditions: [
              {
                entity: "sale" as const,
                attribute: "productId" as const,
                operator: "contains" as const,
                value: "plan",
              },
            ],
          },
        ];

        expect(
          evaluateRewardConditions({
            conditions,
            context: { sale: { productId: "premium-plan" } },
          }),
        ).toEqual(conditions[0]);
      });

      test("should not match when field does not contain the substring", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amountInCents: 5000,
            conditions: [
              {
                entity: "sale" as const,
                attribute: "productId" as const,
                operator: "contains" as const,
                value: "plan",
              },
            ],
          },
        ];

        expect(
          evaluateRewardConditions({
            conditions,
            context: { sale: { productId: "basic-tier" } },
          }),
        ).toBe(null);
      });

      test("should not match when needle is empty string", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amountInCents: 5000,
            conditions: [
              {
                entity: "sale" as const,
                attribute: "productId" as const,
                operator: "contains" as const,
                value: "  ",
              },
            ],
          },
        ];

        expect(
          evaluateRewardConditions({
            conditions,
            context: { sale: { productId: "any-value" } },
          }),
        ).toBe(null);
      });
    });

    describe("not_contains", () => {
      test("should match when field does not contain the substring", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amountInCents: 5000,
            conditions: [
              {
                entity: "sale" as const,
                attribute: "productId" as const,
                operator: "not_contains" as const,
                value: "plan",
              },
            ],
          },
        ];

        expect(
          evaluateRewardConditions({
            conditions,
            context: { sale: { productId: "basic-tier" } },
          }),
        ).toEqual(conditions[0]);
      });

      test("should not match when field contains the substring", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amountInCents: 5000,
            conditions: [
              {
                entity: "sale" as const,
                attribute: "productId" as const,
                operator: "not_contains" as const,
                value: "plan",
              },
            ],
          },
        ];

        expect(
          evaluateRewardConditions({
            conditions,
            context: { sale: { productId: "premium-plan" } },
          }),
        ).toBe(null);
      });

      test("should not match when needle is empty string", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amountInCents: 5000,
            conditions: [
              {
                entity: "sale" as const,
                attribute: "productId" as const,
                operator: "not_contains" as const,
                value: "  ",
              },
            ],
          },
        ];

        expect(
          evaluateRewardConditions({
            conditions,
            context: { sale: { productId: "any-value" } },
          }),
        ).toBe(null);
      });
    });

    describe("starts_with", () => {
      test("should match when string starts with value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amountInCents: 5000,
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
            amountInCents: 5000,
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

      test("should not match when value is empty string", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amountInCents: 5000,
            conditions: [
              {
                entity: "sale" as const,
                attribute: "productId" as const,
                operator: "starts_with" as const,
                value: "",
              },
            ],
          },
        ];

        expect(
          evaluateRewardConditions({
            conditions,
            context: { sale: { productId: "any-value" } },
          }),
        ).toBe(null);
      });
    });

    describe("ends_with", () => {
      test("should match when string ends with value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amountInCents: 5000,
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

      test("should not match when value is empty string", () => {
        expect(
          evaluateRewardConditions({
            conditions: [
              {
                operator: "AND" as const,
                amountInCents: 5000,
                conditions: [
                  {
                    entity: "sale" as const,
                    attribute: "productId" as const,
                    operator: "ends_with" as const,
                    value: "",
                  },
                ],
              },
            ],
            context: { sale: { productId: "any-value" } },
          }),
        ).toBe(null);
      });

      test("should not match when string does not end with value", () => {
        const conditions = [
          {
            operator: "AND" as const,
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
            amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 5000,
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
          type: "flat" as const,
          amountInCents: 1000,
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
          type: "flat" as const,
          amountInCents: 3000, // Highest amount
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
          type: "flat" as const,
          amountInCents: 2000,
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
          type: "flat" as const,
          amountInCents: 1000,
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
          type: "flat" as const,
          amountInCents: 2000,
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
          type: "flat" as const,
          amountInCents: 1500,
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
          type: "flat" as const,
          amountInCents: 1000,
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
          type: "flat" as const,
          amountInCents: 1000,
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

  describe("subscription duration conditions", () => {
    const lessThanOrEqualCondition = [
      {
        operator: "AND" as const,
        type: "flat" as const,
        amountInCents: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "subscriptionDurationMonths" as const,
            operator: "less_than_or_equal" as const,
            value: 12,
          },
        ],
      },
    ];

    const greaterThanCondition = [
      {
        operator: "AND" as const,
        type: "flat" as const,
        amountInCents: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "subscriptionDurationMonths" as const,
            operator: "greater_than" as const,
            value: 12,
          },
        ],
      },
    ];

    test("should match when subscription duration meets less_than_or_equal condition", () => {
      const context: RewardContext = {
        customer: {
          subscriptionDurationMonths: 12,
        },
      };

      const result = evaluateRewardConditions({
        conditions: lessThanOrEqualCondition,
        context,
      });

      expect(result).toEqual(lessThanOrEqualCondition[0]);
    });

    test("should not match when subscription duration is more than less_than_or_equal condition value", () => {
      const context: RewardContext = {
        customer: {
          subscriptionDurationMonths: 16,
        },
      };

      const result = evaluateRewardConditions({
        conditions: lessThanOrEqualCondition,
        context,
      });

      expect(result).toBe(null);
    });

    test("should match when subscription duration meets greater_than condition", () => {
      const context: RewardContext = {
        customer: {
          subscriptionDurationMonths: 16,
        },
      };

      const result = evaluateRewardConditions({
        conditions: greaterThanCondition,
        context,
      });

      expect(result).toEqual(greaterThanCondition[0]);
    });

    test("should not match when subscription duration is less than greater_than condition value", () => {
      const context: RewardContext = {
        customer: {
          subscriptionDurationMonths: 6,
        },
      };

      const result = evaluateRewardConditions({
        conditions: greaterThanCondition,
        context,
      });

      expect(result).toBe(null);
    });
  });

  describe("date conditions", () => {
    const cutoffDate = new Date("2024-06-01T00:00:00.000Z");
    const cutoffTimestamp = cutoffDate.getTime();

    const beforeDate = new Date("2024-01-01T00:00:00.000Z");
    const afterDate = new Date("2024-12-01T00:00:00.000Z");

    const lessThanCondition = [
      {
        operator: "AND" as const,
        type: "flat" as const,
        amountInCents: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "signupDate" as const,
            operator: "less_than" as const,
            value: cutoffTimestamp,
          },
        ],
      },
    ];

    const greaterThanOrEqualCondition = [
      {
        operator: "AND" as const,
        type: "flat" as const,
        amountInCents: 5000,
        conditions: [
          {
            entity: "customer" as const,
            attribute: "subscriptionStartDate" as const,
            operator: "greater_than_or_equal" as const,
            value: cutoffTimestamp,
          },
        ],
      },
    ];

    test("should match when signupDate is before the cutoff (less_than)", () => {
      const context: RewardContext = {
        customer: {
          signupDate: beforeDate,
        },
      };

      const result = evaluateRewardConditions({
        conditions: lessThanCondition,
        context,
      });

      expect(result).toEqual(lessThanCondition[0]);
    });

    test("should not match when signupDate is after the cutoff (less_than)", () => {
      const context: RewardContext = {
        customer: {
          signupDate: afterDate,
        },
      };

      const result = evaluateRewardConditions({
        conditions: lessThanCondition,
        context,
      });

      expect(result).toBeNull();
    });

    test("should match when subscriptionStartDate is on the cutoff (greater_than_or_equal)", () => {
      const context: RewardContext = {
        customer: {
          subscriptionStartDate: cutoffDate,
        },
      };

      const result = evaluateRewardConditions({
        conditions: greaterThanOrEqualCondition,
        context,
      });

      expect(result).toEqual(greaterThanOrEqualCondition[0]);
    });

    test("should not match when subscriptionStartDate is before the cutoff (greater_than_or_equal)", () => {
      const context: RewardContext = {
        customer: {
          subscriptionStartDate: beforeDate,
        },
      };

      const result = evaluateRewardConditions({
        conditions: greaterThanOrEqualCondition,
        context,
      });

      expect(result).toBeNull();
    });

    test("should not match when signupDate is undefined", () => {
      const context: RewardContext = {
        customer: {
          signupDate: undefined,
        },
      };

      const result = evaluateRewardConditions({
        conditions: lessThanCondition,
        context,
      });

      expect(result).toBeNull();
    });
  });

  describe("metadata conditions (lead / sale)", () => {
    test("matches lead metadata equals_to", () => {
      const conditions = [
        {
          operator: "AND" as const,
          type: "flat" as const,
          amountInCents: 100,
          conditions: [
            {
              entity: "lead" as const,
              attribute: "metadata" as const,
              metadataField: "plan",
              operator: "equals_to" as const,
              value: "pro",
            },
          ],
        },
      ];

      const context: RewardContext = {
        lead: { metadata: { plan: "pro" } },
      };

      expect(evaluateRewardConditions({ conditions, context })).toEqual(
        conditions[0],
      );
    });

    test("matches sale metadata greater_than for string number", () => {
      const conditions = [
        {
          operator: "AND" as const,
          type: "flat" as const,
          amountInCents: 200,
          conditions: [
            {
              entity: "sale" as const,
              attribute: "metadata" as const,
              metadataField: "seats",
              operator: "greater_than" as const,
              value: 5,
            },
          ],
        },
      ];

      const context: RewardContext = {
        sale: {
          amount: 1000,
          metadata: { seats: "10" },
        },
      };

      expect(evaluateRewardConditions({ conditions, context })).toEqual(
        conditions[0],
      );
    });

    test("matches sale metadata equals_to when metadata is number and condition value is number", () => {
      const conditions = [
        {
          operator: "AND" as const,
          type: "flat" as const,
          amountInCents: 500,
          conditions: [
            {
              entity: "sale" as const,
              attribute: "metadata" as const,
              metadataField: "seats",
              operator: "equals_to" as const,
              value: 42,
            },
          ],
        },
      ];

      expect(
        evaluateRewardConditions({
          conditions,
          context: { sale: { metadata: { seats: 42 } } },
        }),
      ).toEqual(conditions[0]);
      expect(
        evaluateRewardConditions({
          conditions,
          context: { sale: { metadata: { seats: "42" } } },
        }),
      ).toEqual(conditions[0]);
    });

    test("equals_to uses string comparison when condition.value is a string", () => {
      const conditions = [
        {
          operator: "AND" as const,
          type: "flat" as const,
          amountInCents: 200,
          conditions: [
            {
              entity: "sale" as const,
              attribute: "metadata" as const,
              metadataField: "tier",
              operator: "equals_to" as const,
              value: "gold",
            },
          ],
        },
      ];

      // metadata value is the string "gold" — should match
      expect(
        evaluateRewardConditions({
          conditions,
          context: { sale: { metadata: { tier: "gold" } } },
        }),
      ).toEqual(conditions[0]);

      // metadata value is numeric "42" but condition.value is string "42" — should match
      const numericStringConditions = [
        {
          operator: "AND" as const,
          type: "flat" as const,
          amountInCents: 200,
          conditions: [
            {
              entity: "sale" as const,
              attribute: "metadata" as const,
              metadataField: "tier",
              operator: "equals_to" as const,
              value: "42",
            },
          ],
        },
      ];

      expect(
        evaluateRewardConditions({
          conditions: numericStringConditions,
          context: { sale: { metadata: { tier: "42" } } },
        }),
      ).toEqual(numericStringConditions[0]);

      // metadata value is number 42 and condition.value is string "42" — SHOULD match
      // because we stringify the metadata before comparing when condition.value is a string
      expect(
        evaluateRewardConditions({
          conditions: numericStringConditions,
          context: { sale: { metadata: { tier: 42 } } },
        }),
      ).toEqual(numericStringConditions[0]);
    });

    test("returns null when metadata key is missing", () => {
      const conditions = [
        {
          operator: "AND" as const,
          type: "flat" as const,
          amountInCents: 100,
          conditions: [
            {
              entity: "lead" as const,
              attribute: "metadata" as const,
              metadataField: "missing",
              operator: "equals_to" as const,
              value: "x",
            },
          ],
        },
      ];

      const context: RewardContext = {
        lead: { metadata: { plan: "pro" } },
      };

      expect(evaluateRewardConditions({ conditions, context })).toBeNull();
    });

    test("returns null when metadataField is empty", () => {
      const conditions = [
        {
          operator: "AND" as const,
          type: "flat" as const,
          amountInCents: 100,
          conditions: [
            {
              entity: "sale" as const,
              attribute: "metadata" as const,
              metadataField: "  ",
              operator: "equals_to" as const,
              value: "a",
            },
          ],
        },
      ];

      const context: RewardContext = {
        sale: { metadata: { tier: "a" } },
      };

      expect(evaluateRewardConditions({ conditions, context })).toBeNull();
    });

    test("returns null when metadata value is null (numeric operator)", () => {
      const conditions = [
        {
          operator: "AND" as const,
          type: "flat" as const,
          amountInCents: 100,
          conditions: [
            {
              entity: "sale" as const,
              attribute: "metadata" as const,
              metadataField: "seats",
              operator: "greater_than" as const,
              value: 0,
            },
          ],
        },
      ];

      const context: RewardContext = {
        sale: {
          metadata: { seats: null },
        },
      };

      expect(evaluateRewardConditions({ conditions, context })).toBeNull();
    });

    test("returns null when metadata value is empty string (numeric operator)", () => {
      const conditions = [
        {
          operator: "AND" as const,
          type: "flat" as const,
          amountInCents: 100,
          conditions: [
            {
              entity: "sale" as const,
              attribute: "metadata" as const,
              metadataField: "seats",
              operator: "greater_than" as const,
              value: 0,
            },
          ],
        },
      ];

      const context: RewardContext = {
        sale: {
          metadata: { seats: "" },
        },
      };

      expect(evaluateRewardConditions({ conditions, context })).toBeNull();
    });
  });
});

describe("rewardConditionSchema", () => {
  test("rejects metadata attribute when metadataField is missing or only whitespace", () => {
    expect(
      rewardConditionSchema.safeParse({
        entity: "lead",
        attribute: "metadata",
        operator: "equals_to",
        value: "x",
      }).success,
    ).toBe(false);

    expect(
      rewardConditionSchema.safeParse({
        entity: "lead",
        attribute: "metadata",
        operator: "equals_to",
        value: "x",
        metadataField: "  ",
      }).success,
    ).toBe(false);

    expect(
      rewardConditionSchema.safeParse({
        entity: "lead",
        attribute: "metadata",
        operator: "equals_to",
        value: "x",
        metadataField: "plan",
      }).success,
    ).toBe(true);

    expect(
      rewardConditionSchema.safeParse({
        entity: "sale",
        attribute: "metadata",
        operator: "equals_to",
        value: "x",
        metadataField: "plan",
      }).success,
    ).toBe(true);
  });

  test("rejects metadata attribute for entities other than lead and sale", () => {
    expect(
      rewardConditionSchema.safeParse({
        entity: "customer",
        attribute: "metadata",
        operator: "equals_to",
        value: "x",
        metadataField: "plan",
      }).success,
    ).toBe(false);

    expect(
      rewardConditionSchema.safeParse({
        entity: "partner",
        attribute: "metadata",
        operator: "equals_to",
        value: "x",
        metadataField: "plan",
      }).success,
    ).toBe(false);
  });

  test("allows is one of / is not one of with string arrays", () => {
    expect(
      rewardConditionSchema.safeParse({
        entity: "customer",
        attribute: "country",
        operator: "in",
        value: ["US", "CA"],
      }).success,
    ).toBe(true);

    expect(
      rewardConditionSchema.safeParse({
        entity: "customer",
        attribute: "country",
        operator: "not_in",
        value: ["US", "CA"],
      }).success,
    ).toBe(true);
  });

  test("rejects non-metadata attribute for lead entity", () => {
    expect(
      rewardConditionSchema.safeParse({
        entity: "lead",
        attribute: "country",
        operator: "equals_to",
        value: "US",
      }).success,
    ).toBe(false);

    expect(
      rewardConditionSchema.safeParse({
        entity: "lead",
        attribute: "metadata",
        operator: "equals_to",
        value: "x",
        metadataField: "plan",
      }).success,
    ).toBe(true);
  });

  test("allows non-metadata attributes without metadataField", () => {
    expect(
      rewardConditionSchema.safeParse({
        entity: "customer",
        attribute: "country",
        operator: "equals_to",
        value: "US",
      }).success,
    ).toBe(true);
  });
});
