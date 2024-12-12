import { z } from "zod";
import { stripe } from ".";

// TODO:
// Handle the errors from the stripe API

const connectedAccountSchema = z.object({
  id: z.string(),
  charges_enabled: z.boolean(),
  capabilities: z.object({
    card_payments: z.enum(["inactive", "active"]),
    transfers: z.enum(["inactive", "active"]),
  }),
});

export const retrieveConnectedAccount = async ({
  stripeConnectId,
}: {
  stripeConnectId: string;
}) => {
  const response = await stripe.accounts.retrieve(stripeConnectId);

  return connectedAccountSchema.parse(response);
};
