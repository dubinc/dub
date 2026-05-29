import { sendEmail } from "@dub/email";
import PartnerTremendousPayout from "@dub/email/templates/partner-tremendous-payout";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, currencyFormatter } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { CreateOrder200Response, OrdersApi } from "tremendous";
import { trackCommissionStatusUpdatesByProgram } from "../api/commissions/track-commission-update-activity-log";
import { enqueueBatchJobs } from "../cron/enqueue-batch-jobs";
import { createPayoutsIdempotencyKey } from "../payouts/create-payouts-idempotency-key";
import { tremendousConfiguration, tremendousEnv } from "./configuration";

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

  if (!tremendousEnv.TREMENDOUS_CAMPAIGN_ID) {
    throw new Error("TREMENDOUS_CAMPAIGN_ID is not configured.");
  }

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

  const payouts = await prisma.payout.findMany({
    where: {
      partnerId,
      invoiceId,
      status: "processing",
      mode: "internal",
      method: "tremendous",
      tremendousRewardId: null,
      tremendousOrderId: null,
    },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          logo: true,
          workspaceId: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (payouts.length === 0) {
    console.log("No payouts for sending via Tremendous, skipping...");
    return;
  }

  const totalTransferableAmount = payouts.reduce(
    (acc, payout) => acc + payout.amount,
    0,
  );

  if (totalTransferableAmount === 0) {
    console.log("No payouts for sending via Tremendous, skipping...");
    return;
  }

  const payoutIds = payouts.map((p) => p.id);

  const idempotencyKey = createPayoutsIdempotencyKey({
    partnerId: partner.id,
    invoiceId,
    payoutIds,
  });

  const ordersApi = new OrdersApi(tremendousConfiguration);

  const { data } = await ordersApi.createOrder({
    external_id: idempotencyKey,
    payment: {
      funding_source_id: "balance",
    },
    reward: {
      campaign_id: tremendousEnv.TREMENDOUS_CAMPAIGN_ID,
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
          message: `Dub Partners payout (${[...new Set(payouts.map((p) => p.program.name))].join(", ")})`,
        },
      },
    },
  });

  const { order } = data as CreateOrder200Response;
  const reward = order.rewards?.[0];
  const redeemUrl = reward?.delivery?.link;

  if (order.status !== "EXECUTED") {
    throw new Error(
      `Tremendous order ${order.id} status is not EXECUTED: ${order.status}`,
    );
  }

  if (!redeemUrl) {
    throw new Error(`No redeem URL found for Tremendous order: ${order.id}`);
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

  await prisma.$transaction([
    prisma.payout.updateMany({
      where: {
        id: {
          in: payoutIds,
        },
      },
      data: {
        tremendousOrderId: order.id,
        tremendousRewardId: reward.id,
        status: "completed",
        paidAt: new Date(),
        method: "tremendous",
      },
    }),

    prisma.commission.updateMany({
      where: {
        payoutId: {
          in: payoutIds,
        },
      },
      data: {
        status: "paid",
      },
    }),
  ]);

  waitUntil(
    Promise.allSettled([
      trackCommissionStatusUpdatesByProgram({
        commissions,
        payouts,
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
    const payout = payouts[0];
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
