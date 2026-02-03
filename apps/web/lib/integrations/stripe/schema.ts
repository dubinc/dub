import * as z from "zod/v4";

export const stripeIntegrationSettingsSchema = z.object({
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
});
