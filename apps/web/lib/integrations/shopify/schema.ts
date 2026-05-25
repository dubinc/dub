import * as z from "zod/v4";

export const orderSchema = z.object({
  confirmation_number: z.string(),
  checkout_token: z.string(),
  customer: z
    .object({
      id: z.number(),
      email: z.string().nullish(),
      first_name: z.string().nullish(),
      last_name: z.string().nullish(),
    })
    .nullish(),
  current_subtotal_price_set: z.object({
    shop_money: z
      .object({
        amount: z.string(),
        currency_code: z.string(),
      })
      .describe("Amount in shop currency."),
  }),
  discount_codes: z.array(
    z.object({
      code: z.string().describe("The code of the discount."),
    }),
  ),
  billing_address: z
    .object({
      province: z.string().nullish(),
      country_code: z.string().nullish(),
    })
    .nullish(),
});

export const integrationCredentialsSchema = z.object({
  accessToken: z
    .string()
    .nullish()
    .describe("Encrypted access token for the Shopify store."),
  scope: z.string().nullish().describe("Scope of the Shopify store."),
});
