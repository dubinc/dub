import { z } from "zod";
import { stripe } from ".";
import { onboardPartnerSchema } from "../zod/schemas/partners";

export const createConnectedAccount = async ({
  name,
  email,
  country,
  phoneNumber,
}: Pick<
  z.infer<typeof onboardPartnerSchema>,
  "name" | "email" | "country" | "phoneNumber"
>) => {
  const [firstName, lastName] = name.split(" ");

  try {
    return await stripe.accounts.create({
      type: "express",
      business_type: "individual",
      email,
      country,
      individual: {
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phoneNumber,
      },
      capabilities: {
        transfers: {
          requested: true,
        },
        card_payments: {
          requested: true,
        },
      },
    });
  } catch (error) {
    throw new Error(
      `[Stripe Connect] Failed to create connected account: ${error.message}.`,
    );
  }
};
