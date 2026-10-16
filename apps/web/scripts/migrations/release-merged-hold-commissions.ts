import { prisma } from "@/lib/prisma";
import {
  CommissionStatus,
  FraudEventStatus,
  FraudRuleType,
} from "@prisma/client";
import "dotenv-flow/config";

// Resolution reason the merge workflow used before it released hold commissions.
const MERGE_RESOLUTION_REASON =
  "Automatically resolved because partners with duplicate payout methods were merged";

const execute = process.argv.includes("--execute");

// One-time backfill: release hold commissions left behind when a partner merge
// resolved duplicate-account fraud groups without releasing their holds.
// Dry run by default. Pass --execute to release.
async function main() {
  const resolvedGroups = await prisma.fraudEventGroup.findMany({
    where: {
      type: FraudRuleType.partnerDuplicateAccount,
      status: FraudEventStatus.resolved,
      resolutionReason: {
        startsWith: MERGE_RESOLUTION_REASON,
      },
    },
    select: {
      id: true,
      programId: true,
      partnerId: true,
    },
  });

  const groupIdsByEnrollment = new Map<
    string,
    { programId: string; partnerId: string; groupIds: string[] }
  >();

  for (const { id, programId, partnerId } of resolvedGroups) {
    const key = `${programId}:${partnerId}`;
    const entry = groupIdsByEnrollment.get(key) ?? {
      programId,
      partnerId,
      groupIds: [],
    };

    entry.groupIds.push(id);
    groupIdsByEnrollment.set(key, entry);
  }

  const enrollments = [...groupIdsByEnrollment.values()];

  if (enrollments.length === 0) {
    console.log("No merge-resolved fraud groups found.");
    return;
  }

  const holdCommissions = await prisma.commission.groupBy({
    by: ["programId", "partnerId"],
    where: {
      status: CommissionStatus.hold,
      OR: enrollments.map(({ programId, partnerId }) => ({
        programId,
        partnerId,
      })),
    },
    _count: true,
    _sum: {
      earnings: true,
    },
  });

  if (holdCommissions.length === 0) {
    console.log("No hold commissions left for merge-resolved fraud groups.");
    return;
  }

  // Pending groups decide what releaseHoldCommissions keeps on hold.
  const pendingGroups = await prisma.fraudEventGroup.findMany({
    where: {
      status: FraudEventStatus.pending,
      OR: holdCommissions.map(({ programId, partnerId }) => ({
        programId,
        partnerId,
      })),
    },
    select: {
      programId: true,
      partnerId: true,
      type: true,
    },
  });

  console.table(
    holdCommissions.map(({ programId, partnerId, _count, _sum }) => ({
      programId,
      partnerId,
      holdCommissions: _count,
      holdEarnings: _sum.earnings,
      pendingGroupTypes: pendingGroups
        .filter((g) => g.programId === programId && g.partnerId === partnerId)
        .map((g) => g.type)
        .join(", "),
    })),
  );

  if (!execute) {
    console.log("Dry run. Pass --execute to release these hold commissions.");
    return;
  }

  // Import after dotenv-flow loads the env. The QStash clients read the token
  // when their module loads, and the release triggers QStash jobs.
  const { releaseHoldCommissions } = await import(
    "@/lib/api/fraud/release-hold-commissions"
  );

  let totalReleased = 0;

  for (const { programId, partnerId } of holdCommissions) {
    const { groupIds } = groupIdsByEnrollment.get(`${programId}:${partnerId}`)!;

    const released = await releaseHoldCommissions({
      programId,
      partnerId,
      resolvedGroupIds: groupIds,
    });

    console.log(
      `Released ${released} hold commissions for partner ${partnerId} in program ${programId}`,
    );

    totalReleased += released;
  }

  console.log(`Released ${totalReleased} hold commissions in total.`);
}

main();
