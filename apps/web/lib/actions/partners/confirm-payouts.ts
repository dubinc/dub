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
  excludedPayoutIds: z.array(z.string()).optional(),
  amount: z.number(),
  fee: z.number(),
  total: z.number(),
});

// Confirm payouts
export const confirmPayoutsAction = authActionClient
  .schema(confirmPayoutsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      paymentMethodId,
      cutoffPeriod,
      excludedPayoutIds,
      amount,
      fee,
      total,
    } = parsedInput;

    if (!workspace.defaultProgramId) {
      throw new Error("Workspace does not have a default program.");
    }

    if (workspace.role !== "owner") {
      throw new Error("Only workspace owners can confirm payouts.");
    }

    if (!workspace.stripeId) {
      throw new Error("Workspace does not have a valid Stripe ID.");
    }

    // if workspace's payouts usage + the current invoice amount
    // is greater than the workspace's payouts limit, throw an error
    if (workspace.payoutsUsage + amount > workspace.payoutsLimit) {
      throw new Error(
        exceededLimitError({
          plan: workspace.plan,
          limit: workspace.payoutsLimit,
          type: "payouts",
        }),
      );
    }

    if (amount < 1000) {
      throw new Error(
        "Your payout total is less than the minimum invoice amount of $10.",
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

    const invoice = await prisma.$transaction(async (tx) => {
      // Generate the next invoice number by counting the number of invoices for the workspace
      const totalInvoices = await tx.invoice.count({
        where: {
          workspaceId: workspace.id,
        },
      });
      const paddedNumber = String(totalInvoices + 1).padStart(4, "0");
      const invoiceNumber = `${workspace.invoicePrefix}-${paddedNumber}`;

      // Create the invoice and return it
      return await tx.invoice.create({
        data: {
          id: createId({ prefix: "inv_" }),
          number: invoiceNumber,
          programId: workspace.defaultProgramId!,
          workspaceId: workspace.id,
          // these numbers will be updated later in the payouts/process cron job
          // but we're adding them now for the program/payouts/success screen
          amount,
          fee,
          total,
        },
      });
    });

    // Send the message to Qstash to process the payouts
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
