import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  //
});

const configSchema = z.object({
  //
});

export const checkReferralSourceBanned = defineFraudRule({
  type: "referralSourceBanned",
  contextSchema,
  configSchema,
  evaluate: async (context) => {
    console.log("Evaluating checkReferralSourceBanned...", context);

    return {
      triggered: false,
    };
  },
});
