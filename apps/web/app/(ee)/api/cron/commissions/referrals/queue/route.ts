import { qstash } from "@/lib/cron";
import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { CommissionType } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  invoiceId: z.string(),
  startingAfter: z.string().optional(),
});

const BATCH_SIZE = 1;

// POST /api/cron/commissions/referrals/queue
export const POST = withCron(async ({ rawBody }) => {
  const { invoiceId, startingAfter } = inputSchema.parse(JSON.parse(rawBody));

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      programId: true,
      workspaceId: true,
      status: true,
    },
  });

  if (!invoice) {
    return logAndRespond(`Invoice ${invoiceId} not found.`);
  }

  if (invoice.status === "failed") {
    return logAndRespond(`Invoice ${invoiceId} is failed.`);
  }

  if (!invoice.programId) {
    return logAndRespond(
      `Invoice ${invoiceId} is not associated with a program.`,
    );
  }

  const referralRewardsCount = await prisma.reward.count({
    where: {
      programId: invoice.programId,
      event: "referral",
    },
  });

  // No referral rewards found for the program, no need to proceed further.
  if (referralRewardsCount === 0) {
    return logAndRespond(
      `No referral rewards found for program ${invoice.programId}.`,
    );
  }

  // 1. Find referral-eligible payouts for the invoice
  const payouts = await prisma.payout.findMany({
    where: {
      invoiceId,
      programEnrollment: {
        applicationEvent: {
          referredByPartnerId: {
            not: null,
          },
        },
      },
    },
    select: {
      id: true,
      partnerId: true,
      programEnrollment: {
        select: {
          applicationEvent: {
            select: {
              referredByPartnerId: true,
            },
          },
        },
      },
      commissions: {
        where: {
          type: CommissionType.sale,
        },
        select: {
          id: true,
        },
      },
    },
    take: BATCH_SIZE,
    orderBy: {
      id: "asc",
    },
    ...(startingAfter && {
      skip: 1,
      cursor: { id: startingAfter },
    }),
  });

  const referredByPartnerIds = payouts
    .map(
      (payout) =>
        payout.programEnrollment?.applicationEvent?.referredByPartnerId,
    )
    .filter((id): id is string => id !== undefined);

  // 3) Find the referrer partner program enrollment and referral reward
  const referrerEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId: invoice.programId,
      partnerId: {
        in: referredByPartnerIds,
      },
      status: {
        in: ACTIVE_ENROLLMENT_STATUSES,
      },
    },
    select: {
      partnerId: true,
      referralRewardId: true,
    },
  });

  if (referrerEnrollments.length === 0) {
    return logAndRespond(
      `Referrer partners are not enrolled in program ${invoice.programId}.`,
    );
  }

  const referrerPartnerToReward = new Map<string, string>();

  for (const { partnerId, referralRewardId } of referrerEnrollments) {
    if (!referralRewardId) {
      continue;
    }

    referrerPartnerToReward.set(partnerId, referralRewardId);
  }

  // 4) Build the payload of referral-eligible commissions
  const commissions: { sourceCommissionId: string }[] = [];

  for (const payout of payouts) {
    const referrerPartnerId =
      payout.programEnrollment?.applicationEvent?.referredByPartnerId;

    if (!referrerPartnerId) {
      continue;
    }

    const referralRewardId = referrerPartnerToReward.get(referrerPartnerId);

    if (!referralRewardId) {
      continue;
    }

    if (payout.commissions.length === 0) {
      continue;
    }

    commissions.push(
      ...payout.commissions.map(({ id }) => ({
        sourceCommissionId: id,
      })),
    );
  }

  await enqueueBatchJobs(
    commissions.map(({ sourceCommissionId }) => ({
      queueName: "calculate-referral-commissions",
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/commissions/referrals/calculate`,
      deduplicationId: `calculate-referral-commissions-${sourceCommissionId}`,
      body: {
        sourceCommissionId,
      },
    })),
  );

  if (payouts.length === BATCH_SIZE) {
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/commissions/referrals/queue`,
      body: {
        invoiceId,
        startingAfter: payouts[payouts.length - 1].id,
      },
    });
  }

  return logAndRespond(
    `Enqueued ${payouts.length} referral-eligible payouts for ${invoiceId}.`,
  );
});
