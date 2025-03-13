import { z } from "zod";
import { stripe } from ".";
import { onboardPartnerSchema } from "../zod/schemas/partners";

export const createConnectedAccount = async ({
  name,
  email,
  country,
  businessType,
  companyName,
}: Pick<
  z.infer<typeof onboardPartnerSchema>,
  "name" | "country" | "businessType" | "companyName"
> & {
  email: string;
}) => {
  const [firstName, lastName] = name.split(" ");

  try {
    return await stripe.accounts.create({
      type: "express",
      business_type: businessType,
      email,
      country,
      ...(businessType === "company"
        ? {
            business_profile: {
              name: companyName!,
            },
          }
        : {
            individual: {
              first_name: firstName,
              last_name: lastName,
              email,
            },
          }),
      capabilities: {
        transfers: {
          requested: true,
        },
        ...(country === "US" && {
          card_payments: {
            requested: true,
          },
        }),
      },
      ...(country !== "US" && {
        tos_acceptance: { service_agreement: "recipient" },
      }),
    });
  } catch (error) {
    throw new Error(error.message);
  }
};
