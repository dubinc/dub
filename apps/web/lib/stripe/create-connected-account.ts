import * as z from "zod/v4";
import { stripe } from ".";
import { onboardPartnerSchema } from "../zod/schemas/partners";

export const createConnectedAccount = async ({
  country,
  profileType,
  companyName,
}: Pick<
  z.infer<typeof onboardPartnerSchema>,
  "country" | "profileType" | "companyName"
>) => {
  try {
    return await stripe.accounts.create({
      type: "express",
      business_type: profileType,
      country,
      ...(profileType === "company"
        ? {
            business_profile: {
              name: companyName!,
            },
          }
        : {
            individual: {},
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
      settings: {
        payouts: {
          schedule: {
            interval: "manual",
          },
        },
      },
    });
  } catch (error) {
    throw new Error(error.message);
  }
};
