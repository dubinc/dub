import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { referralRewardConfigSchema } from "@/lib/zod/schemas/rewards";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";
import { CommissionType } from "@prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

// POST /api/cron/commissions/referrals/backfill
export const POST = withCron(async ({ rawBody }) => {
  const { programId, partnerId } = inputSchema.parse(JSON.parse(rawBody));

  const applicationEvent = await prisma.programApplicationEvent.findUnique({
    where: {
      programId_partnerId: {
        programId,
        partnerId,
      },
    },
    select: {
      referredByPartnerId: true,
    },
  });

  if (!applicationEvent) {
    return logAndRespond(
      `Application event not found for partner ${partnerId} in program ${programId}. Skipping...`,
    );
  }

  const { referredByPartnerId } = applicationEvent;

  if (!referredByPartnerId) {
    return logAndRespond(
      `Application event for partner ${partnerId} in program ${programId} has no referred by partner. Skipping...`,
    );
  }

  const referrerEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: referredByPartnerId,
        programId,
      },
    },
    select: {
      referralReward: true,
    },
  });

  if (!referrerEnrollment) {
    return logAndRespond(
      `Referrer program enrollment not found for partner ${referredByPartnerId} in program ${programId}. Skipping...`,
    );
  }

  const { referralReward } = referrerEnrollment;

  if (!referralReward) {
    return logAndRespond(
      `Referrer has no referral reward. Skipping past commission backfill.`,
    );
  }

  const { trigger } = referralRewardConfigSchema.parse(referralReward.config);

  if (["commissionThreshold", "partnerApproved"].includes(trigger)) {
    await enqueueBatchJobs([
      {
        queueName: "create-referral-commissions",
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/commissions/referrals/create`,
        deduplicationId: `create-referral-commissions-${programId}-${partnerId}`,
        body: {
          programId,
          partnerId,
        },
      },
    ]);

    return logAndRespond(
      `Enqueued 1 referral commission job for partner ${partnerId}.`,
    );
  }

  if (["saleRecorded", "commissionEarned"].includes(trigger)) {
    const commissions = await prisma.commission.findMany({
      where: {
        programId,
        partnerId,
        type: CommissionType.sale,
        status: {
          in: ["pending", "processed", "paid"],
        },
      },
      select: {
        id: true,
      },
    });

    if (commissions.length === 0) {
      return logAndRespond(
        `No eligible sale commissions found for partner ${partnerId}.`,
      );
    }

    for (const commissionChunk of chunk(commissions, 50)) {
      await enqueueBatchJobs(
        commissionChunk.map((commission) => ({
          queueName: "create-referral-commissions",
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/commissions/referrals/create`,
          deduplicationId: `create-referral-commissions-${commission.id}`,
          body: {
            sourceCommissionId: commission.id,
          },
        })),
      );
    }

    return logAndRespond(
      `Enqueued ${commissions.length} referral commission jobs for partner ${partnerId}.`,
    );
  }

  return logAndRespond(
    `Referral reward trigger "${trigger}" does not support past event backfill. Skipping...`,
  );
});
