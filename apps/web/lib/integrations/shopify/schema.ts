import { z } from "zod";

export const orderSchema = z.object({
  current_subtotal_price: z.string(),
  currency: z.string(),
  confirmation_number: z.string(),
  checkout_token: z.string(),
  customer: z.object({
    id: z.number(),
    email: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
  }),
});
