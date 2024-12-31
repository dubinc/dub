import { z } from "zod";

export const orderSchema = z.object({
  subtotal_price: z.string(),
  currency: z.string(),
  confirmation_number: z.string(),
  checkout_token: z.string(),
  customer: z.object({
    id: z.number(),
  }),
});
