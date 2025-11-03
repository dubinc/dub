import { createWorkflowLogger } from "@/lib/cron/qstash-workflow-logger";
import { createStripeTransfer } from "@/lib/partners/create-stripe-transfer";
import { createStripeTransferWorkflowSchema } from "@/lib/zod/schemas/payouts";
import { sendBatchEmail } from "@dub/email";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { serve } from "@upstash/workflow/nextjs";
import { z } from "zod";

// POST /api/cron/payouts/create-stripe-transfer
export const { POST } = serve<
  z.infer<typeof createStripeTransferWorkflowSchema>
>(
  async (context) => {
    const input = context.requestPayload;
    const { partnerId, invoiceId, chargeId } = input;

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

    const commonInclude = Prisma.validator<Prisma.PayoutInclude>()({
      program: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
    });

    // Step 1: Create Stripe transfer for the payouts
    await context.run("create-stripe-transfer", async () => {
      if (!partner) {
        console.error(`Partner ${partnerId} not found. Cancelling workflow...`);
        await context.cancel();
        return;
      }

      if (!partner.payoutsEnabledAt) {
        console.error(
          `Partner ${partnerId} has not enabled payouts. Cancelling workflow...`,
        );
        await context.cancel();
        return;
      }

      if (!partner.stripeConnectId) {
        console.error(
          `Missing stripeConnectId for partner ${partnerId}. Cancelling workflow...`,
        );
        await context.cancel();
        return;
      }

      // Find the payouts to process for the partner in this invoice
      const currentInvoicePayouts = await prisma.payout.findMany({
        where: {
          invoiceId,
          partnerId: partner.id,
          status: "processing",
        },
        include: commonInclude,
      });

      if (currentInvoicePayouts.length === 0) {
        console.log(
          "No payouts to process for partner in this invoice, skipping...",
        );
        await context.cancel();
        return;
      }

      // Get all previously processed payouts for the partners in this invoice
      // but haven't been transferred to their Stripe Express account yet
      const previouslyProcessedPayouts = await prisma.payout.findMany({
        where: {
          partnerId: partner.id,
          status: "processed",
          stripeTransferId: null,
        },
        include: commonInclude,
      });

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
        console.error(`Partner ${partnerId} not found. Skipping...`);
        return;
      }

      if (!partner.email) {
        console.error(`Missing email for partner ${partnerId}. Skipping...`);
        return;
      }

      // Find all processed payouts for the partner in this invoice
      const processedPayouts = await prisma.payout.findMany({
        where: {
          invoiceId,
          partnerId: partner.id,
          status: "processed",
        },
        include: commonInclude,
      });

      if (processedPayouts.length === 0) {
        return;
      }

      const { data, error } = await sendBatchEmail(
        processedPayouts.map((payout) => ({
          variant: "notifications",
          to: partner.email!,
          subject: "You've been paid!",
          react: PartnerPayoutProcessed({
            email: partner.email!,
            variant: "stripe",
            program: {
              name: payout.program.name,
              logo: payout.program.logo,
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
        console.log(`Email notification sent to partner ${partnerId}`, data);
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
