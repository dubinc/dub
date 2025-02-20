import { z } from "zod";

export const orderSchema = z.object({
  confirmation_number: z.string(),
  checkout_token: z.string(),
  customer: z.object({
    id: z.number(),
    email: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
  }),
  current_subtotal_price_set: z.object({
    shop_money: z
      .object({
        amount: z.string(),
        currency_code: z.string(),
      })
      .describe("Amount in shop currency."),
  }),
});
