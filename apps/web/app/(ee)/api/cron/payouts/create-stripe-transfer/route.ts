import { createWorkflowLogger } from "@/lib/cron/qstash-workflow-logger";
import { createStripeTransfer } from "@/lib/partners/create-stripe-transfer";
import { createStripeTransferWorkflowSchema } from "@/lib/zod/schemas/payouts";
import { sendBatchEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { serve } from "@upstash/workflow/nextjs";
import { z } from "zod";

// POST /api/cron/payouts/create-stripe-transfer
export const { POST } = serve<
  z.infer<typeof createStripeTransferWorkflowSchema>
>(
  async (context) => {
    const input = context.requestPayload;
    const {
      partnerId,
      chargeId,
      previouslyProcessedPayouts,
      currentInvoicePayouts,
    } = input;

    const logger = createWorkflowLogger({
      workflowId: "create-stripe-transfer",
      workflowRunId: context.workflowRunId,
    });

    logger.info({
      message: "Started executing workflow....",
      data: input,
    });

    // Find the partner
    const partner = await prisma.partner.findUnique({
      where: {
        id: partnerId,
      },
      select: {
        id: true,
        email: true,
        payoutsEnabledAt: true,
        stripeConnectId: true,
      },
    });

    // Step 1: Create Stripe transfer for the payouts
    await context.run("create-stripe-transfer", async () => {
      if (!partner) {
        logger.error({
          message: `Partner ${partnerId} not found. Skipping...`,
        });
        return;
      }

      if (!partner.payoutsEnabledAt) {
        logger.error({
          message: `Partner ${partnerId} has not enabled payouts. Skipping...`,
        });
        return;
      }

      if (!partner.stripeConnectId) {
        logger.error({
          message: `Missing stripeConnectId for partner ${partnerId}. Skipping...`,
        });
        return;
      }

      await createStripeTransfer({
        partner,
        previouslyProcessedPayouts,
        currentInvoicePayouts,
        chargeId,
      });
    });

    // Step 2: Send email notification to the partner
    await context.run("send-email-notification", async () => {
      if (!partner) {
        logger.error({
          message: `Partner ${partnerId} not found. Skipping...`,
        });
        return;
      }

      if (!partner.email) {
        logger.error({
          message: `Email not found for partner ${partnerId}. Skipping...`,
        });
        return;
      }

      const { program } = currentInvoicePayouts[0];

      const { data, error } = await sendBatchEmail(
        currentInvoicePayouts.map((payout) => ({
          variant: "notifications",
          to: partner.email!,
          subject: "You've been paid!",
          react: PartnerPayoutProcessed({
            email: partner.email!,
            variant: "stripe",
            program: {
              name: program.name,
              logo: program.logo,
            },
            payout: {
              id: payout.id,
              amount: payout.amount,
              periodStart: payout.periodStart
                ? new Date(payout.periodStart)
                : null,
              periodEnd: payout.periodEnd ? new Date(payout.periodEnd) : null,
            },
          }),
        })),
      );

      if (data) {
        logger.info({
          message: `Email notification sent to partner ${partnerId}.`,
          data,
        });
      }

      if (error) {
        throw new Error(error.message);
      }
    });
  },
  {
    initialPayloadParser: (requestPayload) => {
      return createStripeTransferWorkflowSchema.parse(
        JSON.parse(requestPayload),
      );
    },
  },
);
