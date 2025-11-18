import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  partner: z.object({
    email: z.string().nullable().default(null),
  }),
});

export const checkPartnerEmailMasked = defineFraudRule({
  type: "partnerEmailMasked",
  contextSchema,
  evaluate: async (context) => {
    console.log("Evaluating checkPartnerEmailMasked...");

    const { partner } = context;

    // If no partner email provided, rule doesn't trigger
    if (!partner.email) {
      return {
        triggered: false,
      };
    }

    // Extract domain from email
    const emailParts = partner.email.split("@");
    if (emailParts.length !== 2) {
      return {
        triggered: false,
      };
    }

    const domain = emailParts[1].toLowerCase().trim();

    // Check if domain is Apple's Hide My Email domain
    const isAppleHideMyEmail = domain === "privaterelay.appleid.com";

    return {
      triggered: isAppleHideMyEmail,
    };
  },
});
