import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { getBountiesByGroups } from "./get-bounties-by-groups";

// TODO:
// Need a better method name

// Trigger the creation of draft submissions for performance bounties that uses all-time stats for the given partners
export async function triggerDraftBountySubmissionCreation({
  programId,
  partnerIds,
}: {
  programId: string;
  partnerIds: string[];
}) {
  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: partnerIds,
      },
    },
    select: {
      partnerId: true,
      groupId: true,
    },
  });

  const groupIds = [
    ...new Set(
      programEnrollments
        .map(({ groupId }) => groupId)
        .filter((id): id is string => id !== null),
    ),
  ];

  if (groupIds.length === 0) {
    return;
  }

  const bountiesByGroups = await getBountiesByGroups({
    programId,
    groupIds,
  });

  const partnersByGroup = programEnrollments.reduce(
    (acc, enrollment) => {
      if (enrollment.groupId) {
        acc[enrollment.groupId] = [
          ...(acc[enrollment.groupId] || []),
          enrollment.partnerId,
        ];
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );

  for (const groupId in bountiesByGroups) {
    const eligibleBounties = bountiesByGroups[groupId].filter(
      (bounty) =>
        bounty.type === "performance" && bounty.currentStatsOnly === false,
    );

    if (eligibleBounties.length === 0) {
      console.log(
        `No eligible bounties found for the group ${groupId}. Either there are no performance bounties, or there are no all-time stats.`,
      );
      continue;
    }

    const groupPartnerIds = partnersByGroup[groupId] || [];

    if (groupPartnerIds.length === 0) {
      console.log(`No partners found for the group ${groupId}.`);
      continue;
    }

    console.log(
      `Found ${eligibleBounties.length} eligible bounties for the group ${groupId}.`,
    );

    await Promise.allSettled(
      eligibleBounties.map((bounty) =>
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/create-draft-submissions`,
          body: {
            bountyId: bounty.id,
            partnerIds: groupPartnerIds,
          },
        }),
      ),
    );
  }
}
