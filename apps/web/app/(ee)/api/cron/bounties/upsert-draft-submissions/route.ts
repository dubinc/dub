import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { awardBountyConditionSchema } from "@/lib/api/workflows/award-bounty/schema";
import { bountyEligibilityIncludes } from "@/lib/bounty/api/bounty-availability";
import {
  PartnerLifetimeStats,
  planDraftBountySubmissionUpserts,
} from "@/lib/bounty/api/upsert-draft-bounty-submissions";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { prisma } from "@/lib/prisma";
import { COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { APP_DOMAIN_WITH_NGROK, log, pluck, toCentsNumber } from "@dub/utils";
import { differenceInMinutes } from "date-fns";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  bountyId: z.string(),
  partnerIds: z.array(z.string()).optional(),
  page: z.number().optional().default(0),
});

const MAX_PAGE_SIZE = 100;

// POST /api/cron/bounties/upsert-draft-submissions
// Create OR update draft bounty submissions for lifetime performance bounties
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { bountyId, partnerIds, page } = schema.parse(JSON.parse(rawBody));

    // Find bounty
    const bounty = await prisma.bounty.findUnique({
      where: {
        id: bountyId,
      },
      include: {
        ...bountyEligibilityIncludes,
        workflow: {
          select: {
            triggerConditions: true,
          },
        },
        program: {
          select: {
            id: true,
            defaultGroupId: true,
          },
        },
      },
    });

    if (!bounty) {
      return logAndRespond(`Bounty ${bountyId} not found.`, {
        logLevel: "error",
      });
    }

    if (bounty.startsAt) {
      let diffMinutes = differenceInMinutes(bounty.startsAt, new Date());

      if (diffMinutes >= 10) {
        return logAndRespond(
          `Bounty ${bountyId} not started yet, it will start at ${bounty.startsAt.toISOString()}`,
        );
      }
    }

    if (bounty.type !== "performance") {
      return logAndRespond(`Bounty ${bountyId} is not a performance bounty.`);
    }

    if (bounty.performanceScope === "new") {
      return logAndRespond(
        `Bounty ${bountyId} is limited to new stats; submission creation skipped.`,
      );
    }

    if (!bounty.workflow) {
      return logAndRespond(`Bounty ${bountyId} has no workflow.`);
    }

    const bountyGroupIds = pluck(bounty.groups, "groupId");
    const bountyPartnerTagIds = pluck(bounty.partnerTags, "partnerTagId");

    // Find program enrollments
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId: bounty.programId,
        ...(bountyGroupIds.length > 0 && {
          groupId: {
            in: bountyGroupIds,
          },
        }),
        ...(bountyPartnerTagIds.length > 0 && {
          programPartnerTags: {
            some: {
              partnerTagId: {
                in: bountyPartnerTagIds,
              },
            },
          },
        }),
        ...(partnerIds && {
          partnerId: {
            in: partnerIds,
          },
        }),
        status: {
          in: COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES,
        },
      },
      include: {
        links: {
          select: {
            clicks: true,
            sales: true,
            leads: true,
            conversions: true,
            saleAmount: true,
          },
        },
        partner: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      skip: page * MAX_PAGE_SIZE,
      take: MAX_PAGE_SIZE,
    });

    if (programEnrollments.length === 0) {
      return logAndRespond(
        `No more program enrollments found for bounty ${bountyId}.`,
      );
    }

    console.log(
      `Found ${programEnrollments.length} program enrollments eligible for bounty ${bountyId}.`,
    );

    // Find the workflow condition
    const condition = z
      .array(awardBountyConditionSchema)
      .parse(bounty.workflow.triggerConditions)[0];

    // Partners with their link metrics
    const partners: PartnerLifetimeStats[] = programEnrollments.map(
      (programEnrollment) => {
        return {
          id: programEnrollment.partnerId,
          ...aggregatePartnerLinksStats(programEnrollment.links),
          totalCommissions: toCentsNumber(programEnrollment.totalCommissions),
        };
      },
    );

    const existingDraftSubmissions = await prisma.bountySubmission.findMany({
      where: {
        bountyId: bounty.id,
        partnerId: {
          in: partners.map((partner) => partner.id),
        },
        periodNumber: 1, // only one submission is allowed for performance based bounties
        status: "draft",
      },
      select: {
        id: true,
        partnerId: true,
        performanceCount: true,
      },
    });

    const { toCreate, toUpdate } = planDraftBountySubmissionUpserts({
      partners,
      existingDraftSubmissions: existingDraftSubmissions.map((submission) => ({
        ...submission,
        performanceCount: submission.performanceCount
          ? Number(submission.performanceCount)
          : 0,
      })),
      condition,
      programId: bounty.programId,
      bountyId: bounty.id,
    });

    console.table(toCreate);
    console.table(toUpdate);

    const createdBountySubmissions =
      toCreate.length > 0
        ? await prisma.bountySubmission.createMany({
            data: toCreate,
            skipDuplicates: true,
          })
        : { count: 0 };

    if (toUpdate.length > 0) {
      await Promise.allSettled(
        toUpdate.map((update) =>
          prisma.bountySubmission.update({
            where: {
              id: update.id,
              status: "draft", // in case of race condition, we don't want to update an already submitted entry
            },
            data: {
              performanceCount: update.performanceCount,
              ...(update.promoteToSubmitted && {
                status: "submitted",
                completedAt: new Date(),
              }),
            },
          }),
        ),
      );
    }

    console.log(
      `Upserted bounty submissions for bounty ${bountyId}: created ${createdBountySubmissions.count}, updated ${toUpdate.length}.`,
    );

    if (programEnrollments.length === MAX_PAGE_SIZE) {
      const response = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/upsert-draft-submissions`,
        body: {
          bountyId,
          partnerIds,
          page: page + 1,
        },
      });

      return logAndRespond(
        `Enqueued next page (${page + 1}) for bounty ${bountyId}. ${JSON.stringify(response, null, 2)}`,
      );
    }

    return logAndRespond(
      `Finished upserting submissions for bounty ${bountyId}: created ${createdBountySubmissions.count}, updated ${toUpdate.length}.`,
    );
  } catch (error) {
    await log({
      message: "Upsert bounty submissions cron failed. Error: " + error.message,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
