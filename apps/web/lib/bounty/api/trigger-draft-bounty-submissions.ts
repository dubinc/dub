import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import {
  bountyEligibilityIncludes,
  canPartnerSubmitBounty,
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
        createdAt: true,
        status: true,
        groupJoinedAt: true,
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

  const bounties = await prisma.bounty.findMany({
    where: {
      programId,
      type: "performance",
      performanceScope: "lifetime",
      archivedAt: null,
    },
    include: {
      ...bountyEligibilityIncludes,
    },
  });

  console.log(
    `Found ${bounties.length} eligible performance bounties for program ${programId}.`,
    {
      bounties,
    },
  );

  if (bounties.length === 0) {
    return;
  }

  await Promise.allSettled(
    bounties.map(async (bounty) => {
      const eligiblePartnerIds = programEnrollments
        .filter((programEnrollment) =>
          canPartnerSubmitBounty({
            programEnrollment,
            bounty,
          }),
        )
        .map(({ partnerId }) => partnerId);

      if (eligiblePartnerIds.length === 0) {
        return;
      }

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
