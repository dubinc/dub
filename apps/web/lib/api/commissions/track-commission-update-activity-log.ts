import {
  trackActivityLog,
  type TrackActivityLogInput,
} from "@/lib/api/activity-log/track-activity-log";
import { CommissionActivitySnapshot } from "@/lib/types";
import type { Commission, CommissionStatus } from "@dub/prisma/client";
import { groupBy } from "@dub/utils";
import { getResourceDiff } from "../activity-log/get-resource-diff";

interface TrackActivityLogParams
  extends Omit<
    TrackActivityLogInput,
    "action" | "changeSet" | "resourceType" | "batchId" | "resourceId"
  > {
  old: Pick<Commission, "id" | "amount" | "earnings" | "status">[] | null;
  new: Pick<Commission, "id" | "amount" | "earnings" | "status">[] | null;
}

const COMMISSION_ACTIVITY_FIELDS = ["amount", "earnings", "status"];

export function toCommissionActivitySnapshot(
  commission: Pick<Commission, "id" | "amount" | "earnings" | "status">,
): CommissionActivitySnapshot {
  return {
    amount: commission.amount,
    earnings: commission.earnings,
    status: commission.status,
  };
}

export async function trackCommissionActivityLog({
  old: oldCommissions,
  new: newCommissions,
  ...baseInput
}: TrackActivityLogParams) {
  const activityLogs: TrackActivityLogInput[] = [];

  const oldById = new Map((oldCommissions ?? []).map((c) => [c.id, c]));
  const newById = new Map((newCommissions ?? []).map((c) => [c.id, c]));

  const commissionIds = [
    ...new Set([...oldById.keys(), ...newById.keys()]),
  ].sort();

  for (const id of commissionIds) {
    const oldCommission = oldById.get(id);
    const newCommission = newById.get(id);

    if (oldCommission && newCommission) {
      const oldSnapshot = toCommissionActivitySnapshot(oldCommission);
      const newSnapshot = toCommissionActivitySnapshot(newCommission);

      const diff = getResourceDiff(oldSnapshot, newSnapshot, {
        fields: COMMISSION_ACTIVITY_FIELDS,
      });

      if (diff) {
        activityLogs.push({
          ...baseInput,
          resourceId: newCommission.id,
          resourceType: "commission",
          action: "commission.updated",
          changeSet: {
            commission: {
              old: oldSnapshot,
              new: newSnapshot,
            },
          },
        });
      }
    }
  }

  return await trackActivityLog(activityLogs);
}

// Track activity logs for commissions that are all being updated to the same new status.
// Useful for bulk operations like aggregate-due-commissions, ban/unban, payouts, etc.
export async function trackCommissionStatusUpdate({
  commissions,
  newStatus,
  ...baseInput
}: {
  commissions: Pick<Commission, "id" | "amount" | "earnings" | "status">[];
  newStatus: CommissionStatus;
} & Pick<TrackActivityLogInput, "workspaceId" | "programId" | "userId">) {
  if (commissions.length === 0) {
    return;
  }

  return trackCommissionActivityLog({
    ...baseInput,
    old: commissions,
    new: commissions.map((commission) => ({
      ...commission,
      status: newStatus,
    })),
  });
}

// For payouts that may span multiple programs: resolve workspace from payouts, then
// delegate to trackCommissionStatusUpdate once per program.
export async function trackCommissionStatusUpdatesByProgram({
  commissions,
  payouts,
  newStatus = "paid",
}: {
  commissions: Pick<
    Commission,
    "id" | "amount" | "earnings" | "status" | "programId"
  >[];
  payouts: Array<{ program: { id: string; workspaceId: string } }>;
  newStatus?: CommissionStatus;
}) {
  if (commissions.length === 0) {
    return;
  }

  const workspaceByProgram = new Map(
    payouts.map((p) => [p.program.id, p.program.workspaceId]),
  );

  const commissionsByProgram = groupBy(commissions, (c) => c.programId);

  for (const [programId, commissions] of Object.entries(commissionsByProgram)) {
    const workspaceId = workspaceByProgram.get(programId);

    if (!workspaceId) {
      console.error(
        `Workspace not found for program ${programId}. Skipping...`,
      );
      continue;
    }

    await trackCommissionStatusUpdate({
      workspaceId,
      programId,
      commissions,
      newStatus,
    });
  }
}
