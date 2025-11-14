import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  //
});

const configSchema = z.object({
  //
});

export const checkCustomerEmailMatch = defineFraudRule({
  type: "customerEmailMatch",
  contextSchema,
  configSchema,
  evaluate: async (context) => {
    console.log("Evaluating checkCustomerEmailMatch...", context);

    return {
      triggered: false,
    };
  },
});
