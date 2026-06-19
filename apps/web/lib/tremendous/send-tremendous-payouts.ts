import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import PartnerTremendousPayout from "@dub/email/templates/partner-tremendous-payout";
import {
  APP_DOMAIN_WITH_NGROK,
  chunk,
  currencyFormatter,
  log,
} from "@dub/utils";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { CreateOrder200Response, OrdersApi } from "tremendous";
import { trackCommissionStatusUpdatesByProgram } from "../api/commissions/track-commission-update-activity-log";
import { enqueueBatchJobs } from "../cron/enqueue-batch-jobs";
import { createPayoutsIdempotencyKey } from "../payouts/create-payouts-idempotency-key";
import { markPayoutsAsProcessed } from "../payouts/mark-payouts-as-processed";
import { tremendousConfiguration } from "./configuration";
import { TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS } from "./constants";

export async function sendTremendousPayouts({
  partnerId,
  invoiceId,
  forceWithdrawal = false,
}: {
  partnerId: string;
  invoiceId?: string;
  forceWithdrawal?: boolean;
}) {
  console.log(`Processing Tremendous payouts....`, {
    partnerId,
    invoiceId,
    forceWithdrawal,
  });

  const partner = await prisma.partner.findUniqueOrThrow({
    where: {
      id: partnerId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      tremendousEmail: true,
      payoutsEnabledAt: true,
    },
  });

  if (!partner.tremendousEmail || !partner.payoutsEnabledAt) {
    throw new Error(
      `Partner ${partner.email} does not have an active payout account.`,
    );
  }

  const commonInclude: Prisma.PayoutInclude = {
    program: {
      select: {
        id: true,
        name: true,
        logo: true,
        workspaceId: true,
        tremendousCampaignId: true,
      },
    },
  };

  const [previouslyProcessedPayouts, currentInvoicePayouts] = await Promise.all(
    [
      prisma.payout.findMany({
        where: {
          partnerId: partner.id,
          status: "processed",
          tremendousOrderId: null,
          mode: "internal",
          method: "tremendous",
          amount: {
            lte: TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS,
          },
        },
        orderBy: {
          id: "asc",
        },
        include: commonInclude,
      }),
      invoiceId
        ? prisma.payout.findMany({
            where: {
              partnerId: partner.id,
              invoiceId,
              status: "processing",
              mode: "internal",
              method: "tremendous",
              tremendousOrderId: null,
              amount: {
                lte: TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS,
              },
            },
            orderBy: {
              id: "asc",
            },
            include: commonInclude,
          })
        : Promise.resolve([]),
    ],
  );

  const allPayouts = [...previouslyProcessedPayouts, ...currentInvoicePayouts];

  if (allPayouts.length === 0) {
    console.log("No payouts for sending via Tremendous, skipping...");
    return;
  }

  const totalTransferableAmount = allPayouts.reduce(
    (acc, payout) => acc + payout.amount,
    0,
  );

  if (totalTransferableAmount === 0) {
    console.log("No payouts for sending via Tremendous, skipping...");
    return;
  }

  if (totalTransferableAmount > TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS) {
    throw new Error(
      `Tremendous payout amount is greater than the maximum allowed amount of ${currencyFormatter(TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS)}.`,
    );
  }

  const payoutIds = allPayouts.map((p) => p.id);

  const idempotencyKey = createPayoutsIdempotencyKey({
    partnerId: partner.id,
    invoiceId,
    payoutIds,
  });

  const program = allPayouts[0].program;

  if (!program.tremendousCampaignId) {
    throw new Error(
      "Tremendous campaign ID is not configured for this program.",
    );
  }

  const ordersApi = new OrdersApi(tremendousConfiguration);

  const { data } = await ordersApi.createOrder({
    external_id: idempotencyKey,
    payment: {
      funding_source_id: "balance",
    },
    reward: {
      campaign_id: program.tremendousCampaignId,
      value: {
        denomination: totalTransferableAmount / 100,
        currency_code: "USD",
      },
      recipient: {
        email: partner.tremendousEmail,
        name: partner.name || partner.tremendousEmail,
      },
      delivery: {
        method: "LINK",
        meta: {
          message: `Dub Partners payout (${[...new Set(allPayouts.map((p) => p.program.name))].join(", ")})`,
        },
      },
    },
  });

  const { order } = data as CreateOrder200Response;
  const reward = order.rewards?.[0];
  const redeemUrl = reward?.delivery?.link;

  if (order.status !== "EXECUTED") {
    console.error(
      `Tremendous order ${order.id} status is not EXECUTED: ${order.status}`,
    );
    await markPayoutsAsProcessed(currentInvoicePayouts);
    return;
  }

  if (!redeemUrl) {
    console.error(`No redeem URL found for Tremendous order: ${order.id}`);
    await markPayoutsAsProcessed(currentInvoicePayouts);
    return;
  }

  console.log("Tremendous order created", order);

  const commissions = await prisma.commission.findMany({
    where: {
      payoutId: {
        in: payoutIds,
      },
    },
    select: {
      id: true,
      amount: true,
      earnings: true,
      status: true,
      programId: true,
    },
  });

  await prisma.payout.updateMany({
    where: {
      id: {
        in: payoutIds,
      },
    },
    data: {
      tremendousOrderId: order.id,
      status: "completed",
      paidAt: new Date(),
      method: "tremendous",
    },
  });

  const commissionIds = commissions.map((c) => c.id);

  let totalUpdatedCommissions = 0;
  for (const commissionIdsBatch of chunk(commissionIds, 250)) {
    try {
      const { count } = await prisma.commission.updateMany({
        where: {
          id: {
            in: commissionIdsBatch,
          },
        },
        data: {
          status: "paid",
        },
      });

      totalUpdatedCommissions += count;
      console.log(
        `Marked ${totalUpdatedCommissions}/${commissionIds.length} commissions as paid`,
      );
    } catch (error) {
      await log({
        message: `[sendTremendousPayouts] Failed to mark commissions as paid for payouts ${payoutIds.join(
          ", ",
        )}: ${error.message}`,
        type: "errors",
        mention: true,
      });
    }
  }

  waitUntil(
    Promise.allSettled([
      trackCommissionStatusUpdatesByProgram({
        commissions,
        payouts: allPayouts,
        newStatus: "paid",
      }),

      enqueueBatchJobs(
        payoutIds.map((payoutId) => ({
          queueName: "create-referral-commissions",
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/commissions/referrals/queue`,
          body: {
            payoutId,
          },
        })),
      ),
    ]),
  );

  if (partner.email) {
    const payout = allPayouts[0];
    const formattedAmount = currencyFormatter(totalTransferableAmount);

    await sendEmail({
      variant: "notifications",
      to: partner.email,
      subject: forceWithdrawal
        ? `A withdrawal of ${formattedAmount} has been initiated from your Dub account`
        : `You've received a ${formattedAmount} reward from ${payout.program.name}`,
      react: PartnerTremendousPayout({
        email: partner.email,
        program: payout.program,
        payout: {
          ...payout,
          amount: totalTransferableAmount,
        },
        redeemUrl,
      }),
    });
  }
}
