import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  //
});

const configSchema = z.object({
  //
});

export const checkPaidTrafficDetected = defineFraudRule({
  type: "paidTrafficDetected",
  contextSchema,
  configSchema,
  evaluate: async (context) => {
    console.log("Evaluating checkPaidTrafficDetected...", context);

    return {
      triggered: false,
    };
  },
});
