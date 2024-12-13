"use server";

import { stripe } from "@/lib/stripe";
import z from "@/lib/zod";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  type: z.enum(["account_onboarding", "account_update"]),
});

export const createAccountLinkAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;

    if (!partner.stripeConnectId) {
      throw new Error("Partner does not have a Stripe Connect account.");
    }

    const { type } = schema.parse(parsedInput);

    const { url } = await stripe.accountLinks.create({
      account: partner.stripeConnectId,
      refresh_url: `${APP_DOMAIN_WITH_NGROK}/settings`,
      return_url: `${APP_DOMAIN_WITH_NGROK}/settings`,
      type,
      collect: "eventually_due",
    });

    return {
      url,
    };
  });
