"use server";

import { createId } from "@/lib/api/create-id";
import { exceededLimitError } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { PAYMENT_METHOD_TYPES } from "@/lib/partners/constants";
import { CUTOFF_PERIOD_ENUM } from "@/lib/partners/cutoff-period";
import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import z from "zod";
import { authActionClient } from "../safe-action";

const confirmPayoutsSchema = z.object({
  workspaceId: z.string(),
  paymentMethodId: z.string(),
  cutoffPeriod: CUTOFF_PERIOD_ENUM,
  amount: z.number(),
  excludedPayoutIds: z.array(z.string()).optional(),
});

// Confirm payouts
export const confirmPayoutsAction = authActionClient
  .schema(confirmPayoutsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { paymentMethodId, cutoffPeriod, amount, excludedPayoutIds } =
      parsedInput;

    if (!workspace.defaultProgramId) {
      throw new Error("Workspace does not have a default program.");
    }

    if (workspace.role !== "owner") {
      throw new Error("Only workspace owners can confirm payouts.");
    }

    if (!workspace.stripeId) {
      throw new Error("Workspace does not have a valid Stripe ID.");
    }

    if (workspace.payoutsUsage > workspace.payoutsLimit) {
      throw new Error(
        exceededLimitError({
          plan: workspace.plan,
          limit: workspace.payoutsLimit,
          type: "payouts",
        }),
      );
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

    // Generate the next invoice number
    const totalInvoices = await prisma.invoice.count({
      where: {
        workspaceId: workspace.id,
      },
    });
    const paddedNumber = String(totalInvoices + 1).padStart(4, "0");
    const invoiceNumber = `${workspace.invoicePrefix}-${paddedNumber}`;

    // Create the invoice for the payouts
    const invoice = await prisma.invoice.create({
      data: {
        id: createId({ prefix: "inv_" }),
        number: invoiceNumber,
        programId: workspace.defaultProgramId!,
        workspaceId: workspace.id,
        amount, // this will be updated later in the payouts/process cron job, we're adding it now for the program/payouts/success screen
      },
    });

    const qstashResponse = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/process`,
      body: {
        workspaceId: workspace.id,
        userId: user.id,
        invoiceId: invoice.id,
        paymentMethodId,
        cutoffPeriod,
        excludedPayoutIds,
      },
    });

    if (qstashResponse.messageId) {
      console.log(`Message sent to Qstash with id ${qstashResponse.messageId}`);
    } else {
      console.error("Error sending message to Qstash", qstashResponse);
    }

    return {
      invoiceId: invoice.id,
    };
  });
