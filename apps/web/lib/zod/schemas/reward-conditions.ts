import { z } from "zod";

// Represend an individual reward condition
export const rewardConditionSchema = z.object({
  entity: z.enum(["customer", "sale"]),
  attribute: z.enum(["country", "productId"]),
  operator: z.enum([
    "equals_to",
    "not_equals",
    "starts_with",
    "ends_with",
    "in",
    "not_in",
  ]),
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
});

// Individual condition can be combined using AND/OR operator
export const rewardConditionsSchema = z.object({
  operator: z.enum(["AND", "OR"]).default("AND"),
  conditions: z.array(rewardConditionSchema).min(1),
  amount: z.number().int().min(0),
});

// The context in which a reward condition is evaluated
export const rewardContextSchema = z.object({
  customer: z
    .object({
      country: z.string().nullish(),
    })
    .optional(),

  sale: z
    .object({
      productId: z.string().nullish(),
    })
    .optional(),
});
