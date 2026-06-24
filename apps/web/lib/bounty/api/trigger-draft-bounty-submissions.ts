import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import {
  bountyEligibilityIncludes,
  isPartnerEligibleForBounty,
} from "./bounty-eligibility";

// Trigger the creation of draft submissions for performance bounties that uses lifetime stats for the given partners
export async function triggerDraftBountySubmissionCreation({
  programId,
  partnerIds,
}: {
  programId: string;
  partnerIds: string[];
}) {
  const [program, programEnrollments] = await Promise.all([
    prisma.program.findUnique({
      where: {
        id: programId,
      },
      select: {
        defaultGroupId: true,
      },
    }),

    prisma.programEnrollment.findMany({
      where: {
        partnerId: {
          in: partnerIds,
        },
        programId,
      },
      select: {
        partnerId: true,
        groupId: true,
        programPartnerTags: {
          select: {
            partnerTagId: true,
          },
        },
      },
    }),
  ]);

  if (!program || programEnrollments.length === 0) {
    return;
  }

  const now = new Date();

  const eligibleBounties = await prisma.bounty.findMany({
    where: {
      programId,
      type: "performance",
      performanceScope: "lifetime",
      startsAt: {
        lte: now,
      },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    include: {
      ...bountyEligibilityIncludes,
    },
  });

  if (eligibleBounties.length === 0) {
    console.log(
      `No eligible performance bounties found for program ${programId}.`,
    );
    return;
  }

  console.log(
    `Found ${eligibleBounties.length} eligible performance bounties for program ${programId}.`,
    {
      eligibleBounties,
    },
  );

  await Promise.allSettled(
    eligibleBounties.map(async (bounty) => {
      const bountyGroupIds = bounty.groups.map(({ groupId }) => groupId);
      const bountyTagIds = bounty.partnerTags.map(
        ({ partnerTagId }) => partnerTagId,
      );

      const eligiblePartnerIds = programEnrollments
        .filter((enrollment) =>
          isPartnerEligibleForBounty({
            bountyGroupIds,
            bountyTagIds,
            partnerGroupId: enrollment.groupId,
            partnerTagIds: enrollment.programPartnerTags.map(
              ({ partnerTagId }) => partnerTagId,
            ),
          }),
        )
        .map(({ partnerId }) => partnerId);

      if (eligiblePartnerIds.length === 0) {
        console.log(
          `No eligible partners found for bounty ${bounty.id} in program ${programId}.`,
        );
        return;
      }

      console.log(
        `Found ${eligiblePartnerIds.length} eligible partners for bounty ${bounty.id}.`,
      );

      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/create-draft-submissions`,
        body: {
          bountyId: bounty.id,
          partnerIds: eligiblePartnerIds,
        },
      });
    }),
  );
}
