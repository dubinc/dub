import {
  trackActivityLog,
  type TrackActivityLogInput,
} from "@/lib/api/activity-log/track-activity-log";
import type { Commission } from "@dub/prisma/client";
import { getResourceDiff } from "../activity-log/get-resource-diff";

interface TrackActivityLogParams
  extends Omit<
    TrackActivityLogInput,
    "action" | "changeSet" | "resourceType" | "batchId" | "resourceId"
  > {
  old: Commission[] | null;
  new: Commission[] | null;
}

const COMMISSION_ACTIVITY_FIELDS = ["amount", "earnings", "status", "currency"];

function toCommissionActivitySnapshot(
  commission: Pick<Commission, "amount" | "earnings" | "status" | "currency">,
) {
  return {
    amount: commission.amount,
    earnings: commission.earnings,
    status: commission.status,
    currency: commission.currency,
  };
}

export async function trackCommissionActivityLog({
  old: oldCommissions,
  new: newCommissions,
  ...baseInput
}: TrackActivityLogParams) {
  const activityLogs: TrackActivityLogInput[] = [];

  const length = Math.max(
    oldCommissions?.length ?? 0,
    newCommissions?.length ?? 0,
  );

  for (let i = 0; i < length; i++) {
    const oldCommission = oldCommissions?.[i];
    const newCommission = newCommissions?.[i];

    if (oldCommission === undefined || newCommission === undefined) {
      continue;
    }

    // Commission created
    if (oldCommission === null && newCommission !== null) {
      activityLogs.push({
        ...baseInput,
        resourceId: newCommission.id,
        resourceType: "commission",
        action: "commission.created",
        changeSet: {
          commission: {
            old: null,
            new: toCommissionActivitySnapshot(newCommission),
          },
        },
      });
    }

    // Commission updated
    if (oldCommission !== null && newCommission !== null) {
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
