import { stripe } from "@/lib/stripe";
import { z } from "zod";

const bankAccountSchema = z
  .object({
    account_holder_name: z.string().nullable(),
    bank_name: z.string(),
    routing_number: z.string(),
    last4: z.string(),
    status: z.enum([
      "new",
      "validated",
      "verified",
      "verification_failed",
      "tokenized_account_number_deactivated",
      "errored",
    ]),
  })
  .nullable();

export const getPartnerBankAccount = async (stripeAccount: string) => {
  const externalAccounts = await stripe.accounts.listExternalAccounts(
    stripeAccount,
    {
      object: "bank_account",
    },
  );

  return externalAccounts.data.length > 0
    ? bankAccountSchema.parse(externalAccounts.data[0])
    : null;
};
