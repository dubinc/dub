import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  //
});

const configSchema = z.object({
  //
});

export const checkCustomerEmailSimilar = defineFraudRule({
  type: "customerEmailSimilar",
  contextSchema,
  evaluate: async (context) => {
    console.log("Evaluating checkCustomerEmailSimilar...", context);

    return {
      triggered: false,
    };
  },
});
