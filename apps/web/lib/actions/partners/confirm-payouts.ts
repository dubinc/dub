"use server";

import { createId } from "@/lib/api/create-id";
import { exceededLimitError } from "@/lib/api/errors";
import { getEligiblePayouts } from "@/lib/api/payouts/get-eligible-payouts";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { qstash } from "@/lib/cron";
import {
  PAYMENT_METHOD_TYPES,
  STRIPE_PAYMENT_METHOD_NORMALIZATION,
} from "@/lib/partners/constants";
import { CUTOFF_PERIOD_ENUM } from "@/lib/partners/cutoff-period";
import { stripe } from "@/lib/stripe";
import { getWebhooks } from "@/lib/webhook/get-webhooks";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const confirmPayoutsSchema = z.object({
  workspaceId: z.string(),
  paymentMethodId: z.string(),
  cutoffPeriod: CUTOFF_PERIOD_ENUM,
  selectedPayoutId: z.string().optional(),
  excludedPayoutIds: z.array(z.string()).optional(),
  fastSettlement: z.boolean().optional().default(false),
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
      selectedPayoutId,
      excludedPayoutIds,
      fastSettlement,
      amount,
      fee,
      total,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    if (workspace.role !== "owner") {
      throw new Error("Only workspace owners can confirm payouts.");
    }

    if (!workspace.stripeId) {
      throw new Error("Workspace does not have a valid Stripe ID.");
    }

    if (fastSettlement && !workspace.fastDirectDebitPayouts) {
      throw new Error(
        "Fast settlement is not enabled for this program. Contact sales to enable it.",
      );
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

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    if (program.payoutMode !== "internal") {
      const [eligiblePayouts, payoutWebhooks] = await Promise.all([
        getEligiblePayouts({
          program,
          cutoffPeriod,
          selectedPayoutId,
          excludedPayoutIds,
        }),

        getWebhooks({
          workspaceId: workspace.id,
          triggers: ["payout.confirmed"],
          disabled: false,
          installationId: null,
        }),
      ]);

      // Check if the invoice includes any external payouts
      const hasExternalPayouts = eligiblePayouts.find(
        (payout) => payout.mode === "external",
      );

      if (hasExternalPayouts && payoutWebhooks.length === 0) {
        throw new Error(
          `EXTERNAL_WEBHOOK_REQUIRED: This invoice includes at least one external payout, which requires an active webhook subscribed to the "payout.confirmed" event. Please set one up before proceeding.`,
        );
      }
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

    if (fastSettlement && paymentMethod.type !== "us_bank_account") {
      throw new Error("Fast settlement is only supported for ACH payment.");
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
          programId,
          workspaceId: workspace.id,
          // these numbers will be updated later in the payouts/process cron job
          // but we're adding them now for the program/payouts/success screen
          amount,
          fee,
          total,
          paymentMethod: fastSettlement
            ? "ach_fast"
            : STRIPE_PAYMENT_METHOD_NORMALIZATION[paymentMethod.type],
          payoutMode: program.payoutMode,
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
        selectedPayoutId,
        excludedPayoutIds,
      },
      deduplicationId: `process-payouts-${invoice.id}`,
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
