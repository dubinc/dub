import { prisma } from "@/lib/prisma";
import { Prisma, type Reward } from "@prisma/client";

type RewardRow = Reward & {
  partnersCount: bigint | number;
};

// Lists program rewards (optionally filtered by group) with a partnersCount.
export async function listRewards({
  programId,
  groupId,
}: {
  programId: string;
  groupId?: string | null;
}) {
  const rewards = await prisma.$queryRaw<RewardRow[]>(Prisma.sql`
    SELECT
      r.id,
      r.programId,
      r.groupId,
      r.description,
      r.tooltipDescription,
      r.event,
      r.type,
      r.amountInCents,
      r.amountInPercentage,
      r.maxDuration,
      r.modifiers,
      r.config,
      r.spendLimitAmount,
      r.spendLimitInterval,
      r.createdAt,
      r.updatedAt,
      CASE r.event
        WHEN 'click' THEN (
          SELECT COUNT(*)
          FROM ProgramEnrollment pe
          WHERE pe.clickRewardId = r.id
        )
        WHEN 'lead' THEN (
          SELECT COUNT(*)
          FROM ProgramEnrollment pe
          WHERE pe.leadRewardId = r.id
        )
        WHEN 'sale' THEN (
          SELECT COUNT(*)
          FROM ProgramEnrollment pe
          WHERE pe.saleRewardId = r.id
        )
        WHEN 'referral' THEN (
          SELECT COUNT(*)
          FROM ProgramEnrollment pe
          WHERE pe.referralRewardId = r.id
        )
        WHEN 'custom' THEN (
          SELECT COUNT(*)
          FROM ProgramEnrollment pe
          WHERE pe.customRewardId = r.id
        )
      END AS partnersCount
    FROM Reward r
    WHERE r.programId = ${programId}
      ${groupId ? Prisma.sql`AND r.groupId = ${groupId}` : Prisma.sql``}
    ORDER BY r.event DESC, r.createdAt DESC
  `);

  return rewards.map((reward) => ({
    ...reward,
    partnersCount: Number(reward.partnersCount),
  }));
}
