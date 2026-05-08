import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { CommissionType } from "@dub/prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  commissionId: z
    .string()
    .describe(
      "The ID of the commission to calculate a referral commission for.",
    ),
});

// POST /api/cron/commissions/referrals/calculate
export const POST = withCron(async ({ rawBody }) => {
  const { commissionId } = inputSchema.parse(JSON.parse(rawBody));

  const commission = await prisma.commission.findUnique({
    where: {
      id: commissionId,
    },
    select: {
      programId: true,
      type: true,
      programEnrollment: {
        select: {
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

  if (!commission) {
    return logAndRespond(`Commission ${commissionId} not found.`);
  }

  if (commission.type !== CommissionType.sale) {
    return logAndRespond(
      `Commission ${commissionId} is not a sale commission.`,
    );
  }

  const referredByPartnerId =
    commission.programEnrollment?.applicationEvent?.referredByPartnerId;

  if (!referredByPartnerId) {
    return logAndRespond(
      `Commission ${commissionId} is not associated with a referred partner.`,
    );
  }

  const referrerEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: referredByPartnerId,
        programId: commission.programId,
      },
    },
    select: {
      referralReward: true,
    },
  });

  if (!referrerEnrollment) {
    return logAndRespond(
      `Referrer partner ${referredByPartnerId} is not enrolled in program ${commission.programId}.`,
    );
  }

  const referralReward = referrerEnrollment.referralReward;

  if (!referralReward) {
    return logAndRespond(
      `Referrer partner ${referredByPartnerId} is not enrolled in a referral reward program.`,
    );
  }

  return logAndRespond("OK");
});
