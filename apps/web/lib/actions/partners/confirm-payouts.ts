"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { PAYMENT_METHOD_TYPES } from "@/lib/partners/constants";
import { stripe } from "@/lib/stripe";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import z from "zod";
import { authActionClient } from "../safe-action";

const confirmPayoutsSchema = z.object({
  workspaceId: z.string(),
  paymentMethodId: z.string(),
  excludeCurrentMonth: z.boolean().optional().default(false),
});

// Confirm payouts
export const confirmPayoutsAction = authActionClient
  .schema(confirmPayoutsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { paymentMethodId, excludeCurrentMonth } = parsedInput;

    getDefaultProgramIdOrThrow(workspace);

    if (!workspace.stripeId) {
      throw new Error("Workspace does not have a valid Stripe ID.");
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (paymentMethod.customer !== workspace.stripeId) {
      throw new Error("Invalid payout method.");
    }

    if (!PAYMENT_METHOD_TYPES.includes(paymentMethod.type)) {
      throw new Error(
        `We only support ${PAYMENT_METHOD_TYPES.join(
          ", ",
        )} for now. Please update your payout method to one of these.`,
      );
    }

    const qstashResponse = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/confirm`,
      body: {
        workspaceId: workspace.id,
        userId: user.id,
        paymentMethodId,
        excludeCurrentMonth,
      },
    });

    if (qstashResponse.messageId) {
      console.log(`Message sent to Qstash with id ${qstashResponse.messageId}`);
    } else {
      console.error("Error sending message to Qstash", qstashResponse);
    }
  });
