import { syncGroupUtmJob } from "@/lib/jobs/handlers/sync-group-utm-job";
import { prisma } from "@/lib/prisma";

/**
 * Partner UTM macros ({{PARTNER_NAME}}, {{PARTNER_LINK_KEY}}) are resolved into
 * concrete Link.url / utm_* values at write time. When Partner.name or a link key
 * changes, those stored values go stale unless we re-run syncGroupUtmJob.
 *
 * Triggered when:
 * 1. Partner.name changes
 * 2. A partner link key changes
 *
 * Pass groupId when the caller already knows the partner's group (link key changes)
 */

export async function dispatchGroupUtmSyncForPartner({
  partnerId,
  groupId,
}: {
  partnerId: string;
  groupId?: string | null;
}) {
  if (groupId) {
    await syncGroupUtmJob.dispatch(
      {
        groupId,
        partnerIds: [partnerId],
      },
      {
        label: groupId,
      },
    );
    return;
  }

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId,
      groupId: {
        not: null,
      },
    },
    select: {
      groupId: true,
    },
  });

  const groupIds = [
    ...new Set(
      programEnrollments
        .map((enrollment) => enrollment.groupId)
        .filter((id): id is string => id != null),
    ),
  ];

  await Promise.all(
    groupIds.map((groupId) =>
      syncGroupUtmJob.dispatch(
        {
          groupId,
          partnerIds: [partnerId],
        },
        {
          label: groupId,
        },
      ),
    ),
  );
}
