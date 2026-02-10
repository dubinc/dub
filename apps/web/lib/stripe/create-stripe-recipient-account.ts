import type { Partner } from "@dub/prisma/client";
import { stripeV2Fetch } from "./stripe-v2-client";

type CreateStripeRecipientAccountParams = Pick<
  Partner,
  "name" | "country" | "profileType"
> & {
  email: NonNullable<Partner["email"]>;
};

export async function createStripeRecipientAccount({
  name,
  email,
  country,
  profileType,
}: CreateStripeRecipientAccountParams) {
  const { data, error } = await stripeV2Fetch("/v2/core/accounts", {
    body: {
      contact_email: email,
      display_name: name,
      identity: {
        country: (country ?? "us").toLowerCase(),
        entity_type: profileType,
      },
      configuration: {
        recipient: {
          capabilities: {
            crypto_wallets: {
              requested: true,
            },
          },
        },
      },
      include: ["configuration.recipient"],
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
