import { prisma } from "@dub/prisma";
import { Partner, Program } from "@dub/prisma/client";

// Checks for high-risk signals for a partner including cross-program bans
// and duplicate payout methods.
export async function getPartnerHighRiskSignals({
  program,
  partner,
}: {
  program: Pick<Program, "id">;
  partner: Pick<Partner, "id" | "payoutMethodHash">;
}) {
  const [crossProgramBanCount, duplicatePayoutCount] = await Promise.all([
    // Cross-program bans
    prisma.programEnrollment.count({
      where: {
        partnerId: partner.id,
        programId: { not: program.id },
        status: "banned",
      },
    }),

    // Duplicate payout method
    partner.payoutMethodHash
      ? prisma.partner.count({
          where: {
            payoutMethodHash: partner.payoutMethodHash,
          },
        })
      : Promise.resolve(0),
  ]);

  return {
    hasCrossProgramBan: crossProgramBanCount > 0,
    hasDuplicatePayoutMethod: duplicatePayoutCount > 1,
    hasHighRisk: crossProgramBanCount > 0 || duplicatePayoutCount > 1,
  };
}
