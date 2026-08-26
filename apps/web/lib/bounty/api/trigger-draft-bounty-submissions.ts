import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, pluck, prettyPrint } from "@dub/utils";
import { BountyPerformanceScope, BountyType } from "@prisma/client";
import {
  bountyEligibilityIncludes,
  buildBountyActivePeriodWhere,
  buildBountyEligibilityWhere,
  isPartnerEligibleForBounty,
} from "./bounty-availability";

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
      createdAt: true,
      status: true,
      programPartnerTags: {
        select: {
          partnerTagId: true,
        },
      },
    },
  });

  if (programEnrollments.length === 0) {
    console.log(
      `No program enrollments found to trigger draft bounty submissions.`,
    );
    return;
  }

  const groupIds = [
    ...new Set(
      pluck(programEnrollments, "groupId").filter(
        (id): id is string => id !== null,
      ),
    ),
  ];

  const partnerTagIds = [
    ...new Set(
      pluck(programEnrollments, "programPartnerTags").flatMap((tags) =>
        tags.map((tag) => tag.partnerTagId),
      ),
    ),
  ];

  // Find the bounties matching the criteria
  const bounties = await prisma.bounty.findMany({
    where: {
      programId,
      archivedAt: null,
      type: BountyType.performance,
      performanceScope: BountyPerformanceScope.lifetime,
      AND: [
        buildBountyEligibilityWhere({ groupId: groupIds, partnerTagIds }),
        buildBountyActivePeriodWhere(),
      ],
    },
    include: {
      ...bountyEligibilityIncludes,
    },
  });

  if (bounties.length === 0) {
    console.log(
      `No eligible performance bounties found to trigger draft bounty submissions.`,
    );
    return;
  }

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    select: {
      defaultGroupId: true,
    },
  });

  // Find the partners eligible for each bounty
  const bountySubmissionCreationData: {
    bountyId: string;
    partnerIds: string[];
  }[] = [];

  for (const bounty of bounties) {
    const eligiblePartnerIds = programEnrollments
      .filter((programEnrollment) =>
        isPartnerEligibleForBounty({ program, bounty, programEnrollment }),
      )
      .map((e) => e.partnerId);

    if (eligiblePartnerIds.length > 0) {
      bountySubmissionCreationData.push({
        bountyId: bounty.id,
        partnerIds: eligiblePartnerIds,
      });
    }
  }

  if (bountySubmissionCreationData.length === 0) {
    console.log(
      `No eligible partners found to trigger draft bounty submissions.`,
    );
    return;
  }

  console.log(
    `Triggering draft bounty submissions for ${bountySubmissionCreationData.length} bounties.`,
    prettyPrint(bountySubmissionCreationData),
  );

  const results = await Promise.allSettled(
    bountySubmissionCreationData.map(({ bountyId, partnerIds }) =>
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/upsert-draft-submissions`,
        body: {
          bountyId,
          partnerIds,
        },
      }),
    ),
  );

  console.log(
    `Triggered draft bounty submissions for ${results.length} bounties.`,
    results,
  );
}
