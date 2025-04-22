import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { CommissionStatus, Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { createPayout } from "./create-payout";

const limit = 100;

export type PendingCommissionsCursor = {
  programId: string;
  partnerId: string;
};

export const processPendingCommissions = async (
  cursor?: PendingCommissionsCursor,
) => {
  const baseFilter: Prisma.CommissionWhereInput = {
    earnings: { not: 0 },
    status: CommissionStatus.pending,
    payoutId: null,
  };

  // if a cursor is provided, only fetch groups lexicographically after it
  const whereFilter: Prisma.CommissionWhereInput = {
    ...baseFilter,
    ...(cursor && {
      OR: [
        { programId: { gt: cursor.programId } },
        { programId: cursor.programId, partnerId: { gt: cursor.partnerId } },
      ],
    }),
  };

  const commissions = await prisma.commission.groupBy({
    by: ["programId", "partnerId"],
    where: whereFilter,
    take: limit,
    orderBy: [{ programId: "asc" }, { partnerId: "asc" }],
  });

  if (!commissions.length) {
    return {
      message: "No pending sale commissions found. Skipping...",
      commissions: [],
    };
  }

  // Process each commission group (program + partner pair)
  for (const { programId, partnerId } of commissions) {
    try {
      await createPayout({
        programId,
        partnerId,
      });
    } catch (error) {
      await log({
        message: `Error creating payout for programId=${programId}, partnerId=${partnerId}: ${error.message}`,
        type: "cron",
      });
    }
  }

  // if we hit the page limit, schedule the next chunk with updated cursor
  if (commissions.length >= limit) {
    const last = commissions[commissions.length - 1];
    const nextCursor: PendingCommissionsCursor = {
      programId: last.programId,
      partnerId: last.partnerId,
    };

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts`,
      method: "POST",
      body: { cursor: nextCursor },
    });
  }

  return {
    message: "Sale commissions payout created.",
    commissions,
  };
};
