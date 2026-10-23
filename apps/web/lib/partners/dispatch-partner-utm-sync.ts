import { syncGroupUtmJob } from "@/lib/jobs/handlers/sync-group-utm-job";
import { prisma } from "@/lib/prisma";

// Partner UTM macros ({{PARTNER_NAME}}, {{PARTNER_LINK_KEY}}) are resolved into
// concrete Link.url / utm_* values at write time.
// When Partner.name changes, those stored values go stale unless we re-run syncGroupUtmJob.
export async function dispatchGroupUtmSyncForPartner(partnerId: string) {
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

  if (groupIds.length === 0) {
    return;
  }

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
