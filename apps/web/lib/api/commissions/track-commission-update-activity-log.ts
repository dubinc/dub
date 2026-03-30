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

  const oldById = new Map((oldCommissions ?? []).map((c) => [c.id, c]));
  const newById = new Map((newCommissions ?? []).map((c) => [c.id, c]));

  const commissionIds = [
    ...new Set([...oldById.keys(), ...newById.keys()]),
  ].sort();

  for (const id of commissionIds) {
    const oldCommission = oldById.get(id);
    const newCommission = newById.get(id);

    // Commission created
    if (!oldCommission && newCommission) {
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
      continue;
    }

    // Commission updated
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
