import * as z from "zod/v4";

export const stripeIntegrationSettingsSchema = z.object({
  stripeMode: z.enum(["live", "test", "sandbox"]).optional().default("live"),
  freeTrials: z
    .object({
      enabled: z
        .boolean()
        .default(false)
        .describe("Whether to track subscription free trials as lead events."),
      trackQuantity: z
        .boolean()
        .default(false)
        .describe(
          "Whether to track the provisioned quantity in the subscription as separate lead events.",
        ),
    })
    .nullish(),
  discountCodeRestrictions: z
    .object({
      firstTimeTransaction: z.boolean().default(true),
    })
    .default({
      firstTimeTransaction: true,
    }),
});
