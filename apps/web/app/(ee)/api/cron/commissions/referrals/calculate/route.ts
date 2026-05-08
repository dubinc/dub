import { withCron } from "@/lib/cron/with-cron";
import { createReferralCommission } from "@/lib/partner-referrals/create-referral-commission";
import { prisma } from "@dub/prisma";
import { CommissionType } from "@dub/prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  sourceCommissionId: z
    .string()
    .describe(
      "The ID of the commission to calculate a referral commission for.",
    ),
});

// POST /api/cron/commissions/referrals/calculate
export const POST = withCron(async ({ rawBody }) => {
  const { sourceCommissionId } = inputSchema.parse(JSON.parse(rawBody));

  const sourceCommission = await prisma.commission.findUnique({
    where: {
      id: sourceCommissionId,
    },
    include: {
      programEnrollment: {
        select: {
          programId: true,
          partnerId: true,
          applicationEvent: {
            select: {
              referredByPartnerId: true,
            },
          },
        },
      },
    },
  });

  if (!sourceCommission) {
    return logAndRespond(`Commission ${sourceCommissionId} not found.`);
  }

  if (sourceCommission.type !== CommissionType.sale) {
    return logAndRespond(
      `Commission ${sourceCommissionId} is not a sale commission.`,
    );
  }

  const referredByPartnerId =
    sourceCommission.programEnrollment?.applicationEvent?.referredByPartnerId;

  if (!referredByPartnerId) {
    return logAndRespond(
      `Commission ${sourceCommissionId} is not associated with a referred partner.`,
    );
  }

  const referrerProgramEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: referredByPartnerId,
        programId: sourceCommission.programId,
      },
    },
    select: {
      programId: true,
      partnerId: true,
      referralReward: true,
    },
  });

  if (!referrerProgramEnrollment) {
    return logAndRespond(
      `Referrer partner ${referredByPartnerId} is not enrolled in program ${sourceCommission.programId}.`,
    );
  }

  const referralReward = referrerProgramEnrollment.referralReward;

  if (!referralReward) {
    return logAndRespond(
      `Referrer partner ${referredByPartnerId} is not enrolled in a referral reward program.`,
    );
  }

  const commission = await createReferralCommission({
    referrerProgramEnrollment,
    referralReward,
    sourceCommission,
  });

  if (!commission) {
    return logAndRespond(
      `Failed to create referral commission for source commission ${sourceCommissionId} and referrer partner ${referredByPartnerId}.`,
      {
        status: 400,
      },
    );
  }

  return logAndRespond(
    `Referral commission ${commission.id} created successfully.`,
  );
});
