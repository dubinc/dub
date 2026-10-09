import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { describe, expect, test } from "vitest";

describe("calculateSaleEarnings", () => {
  describe("percentage – same as the old truncate path", () => {
    test.each([
      {
        label: "whole cents: $10 sale at 20%",
        saleAmount: 1000,
        percent: 20,
        expected: 200,
      },
      {
        label: "whole cents: $10 sale at 50%",
        saleAmount: 1000,
        percent: 50,
        expected: 500,
      },
      {
        label: "whole cents: $19 sale at 10%",
        saleAmount: 1900,
        percent: 10,
        expected: 190,
      },
      {
        label: "1.4¢ truncates and rounds to the same value",
        saleAmount: 7,
        percent: 20,
        expected: 1,
      },
      {
        label: "0.4¢ stays 0 (below half a cent)",
        saleAmount: 2,
        percent: 20,
        expected: 0,
      },
      {
        label: "zero sale amount",
        saleAmount: 0,
        percent: 20,
        expected: 0,
      },
      {
        label: "zero percent",
        saleAmount: 1000,
        percent: 0,
        expected: 0,
      },
    ])("$label → $expected", ({ saleAmount, percent, expected }) => {
      expect(
        calculateSaleEarnings({
          reward: {
            type: "percentage",
            amountInCents: null,
            amountInPercentage: percent,
          },
          sale: { amount: saleAmount, quantity: 1 },
        }),
      ).toBe(expected);
    });
  });

  describe("percentage – half-up (new vs old truncate)", () => {
    test.each([
      {
        label: "3¢ sale at 20% (ticket: 0.6¢, used to store 0)",
        saleAmount: 3,
        percent: 20,
        expected: 1,
      },
      {
        label: "15¢ sale at 10% (1.5¢, used to store 1)",
        saleAmount: 15,
        percent: 10,
        expected: 2,
      },
      {
        label: "1¢ sale at 50% (0.5¢, used to store 0)",
        saleAmount: 1,
        percent: 50,
        expected: 1,
      },
      {
        label: "500¢ at 2.9% (14.5¢; float 2.9/100 used to round to 14)",
        saleAmount: 500,
        percent: 2.9,
        expected: 15,
      },
    ])("$label → $expected", ({ saleAmount, percent, expected }) => {
      expect(
        calculateSaleEarnings({
          reward: {
            type: "percentage",
            amountInCents: null,
            amountInPercentage: percent,
          },
          sale: { amount: saleAmount, quantity: 1 },
        }),
      ).toBe(expected);
    });
  });

  test("percentage ignores quantity (uses sale amount only)", () => {
    expect(
      calculateSaleEarnings({
        reward: {
          type: "percentage",
          amountInCents: null,
          amountInPercentage: 20,
        },
        sale: { amount: 1000, quantity: 5 },
      }),
    ).toBe(200);
  });

  describe("flat", () => {
    test.each([
      {
        label: "single sale",
        amountInCents: 5000,
        quantity: 1,
        expected: 5000,
      },
      {
        label: "quantity multiplies the flat amount",
        amountInCents: 500,
        quantity: 2,
        expected: 1000,
      },
      {
        label: "zero quantity",
        amountInCents: 500,
        quantity: 0,
        expected: 0,
      },
    ])("$label → $expected", ({ amountInCents, quantity, expected }) => {
      expect(
        calculateSaleEarnings({
          reward: {
            type: "flat",
            amountInCents,
            amountInPercentage: null,
          },
          sale: { amount: 1000, quantity },
        }),
      ).toBe(expected);
    });
  });

  test("returns 0 when reward type is neither flat nor percentage", () => {
    expect(
      calculateSaleEarnings({
        reward: {
          type: "unknown" as "flat",
          amountInCents: 500,
          amountInPercentage: 20,
        },
        sale: { amount: 1000, quantity: 1 },
      }),
    ).toBe(0);
  });
});
