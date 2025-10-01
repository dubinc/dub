import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Bounty } from "@prisma/client";
import { getBountiesByGroups } from "./get-bounties-by-groups";

// TODO:
// Need a better method name

// Trigger the creation of draft submissions for performance bounties that uses lifetime stats for the given partners
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
      programId,
    },
    select: {
      partnerId: true,
      groupId: true,
    },
  });

  if (programEnrollments.length === 0) {
    return;
  }

  const groupIds = [
    ...new Set(
      programEnrollments
        .map(({ groupId }) => groupId)
        .filter((id): id is string => id !== null),
    ),
  ];

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
    const eligibleBounties = bountiesByGroups[groupId].filter((bounty) =>
      isEligiblePerformanceBounty(bounty),
    );

    if (eligibleBounties.length === 0) {
      console.log(
        `No eligible bounties found for the group ${groupId}. Either there are no performance bounties, or there are no lifetime stats.`,
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

function isEligiblePerformanceBounty(bounty: Bounty) {
  const now = new Date();

  if (bounty.type !== "performance") return false;
  if (bounty.performanceScope === "new") return false;
  if (bounty.startsAt > now) return false;
  if (bounty.endsAt && bounty.endsAt <= now) return false;

  return true;
}
