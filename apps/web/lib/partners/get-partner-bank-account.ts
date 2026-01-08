import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import * as z from "zod/v4";

export const bankAccountSchema = z
  .object({
    account_holder_name: z.string().nullable(),
    bank_name: z.string().nullable(),
    routing_number: z.string().nullable(),
    last4: z.string(),
    status: z.enum([
      "new",
      "validated",
      "verified",
      "verification_failed",
      "tokenized_account_number_deactivated",
      "errored",
    ]),
    fingerprint: z.string().nullish(),
  })
  .nullable();

export const getPartnerBankAccount = async (stripeAccount: string) => {
  const externalAccounts = (await stripe.accounts.listExternalAccounts(
    stripeAccount,
    {
      object: "bank_account",
    },
  )) as Stripe.ApiList<Stripe.BankAccount>;

  return externalAccounts.data.length > 0
    ? bankAccountSchema.parse(externalAccounts.data[0])
    : null;
};
