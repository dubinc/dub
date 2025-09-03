import { z } from "zod";

export const payoutsItemSchema = z.object({
  event_type: z.string(),
  resource: z.object({
    sender_batch_id: z.string(), // Dub invoice id
    payout_item_id: z.string(),
    payout_item_fee: z.object({
      currency: z.string(),
      value: z.string(),
    }),
    payout_item: z.object({
      receiver: z.string(),
      sender_item_id: z.string(), // Dub payout id
    }),
    errors: z
      .object({
        name: z.string(),
        message: z.string(),
      })
      .nullish(),
  }),
});
