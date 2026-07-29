import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { awardBountyConditionSchema } from "@/lib/api/workflows/award-bounty/schema";
import {
  PartnerLifetimeStats,
  planDraftBountySubmissionUpserts,
} from "@/lib/bounty/api/upsert-draft-bounty-submissions";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, log, toCentsNumber } from "@dub/utils";
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
// Create or update draft/submitted bounty submissions for lifetime performance bounties
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
        groups: true,
        program: true,
        workflow: true,
      },
    });

    if (!bounty) {
      return logAndRespond(`Bounty ${bountyId} not found.`, {
        logLevel: "error",
      });
    }

    let diffMinutes = differenceInMinutes(bounty.startsAt, new Date());

    if (diffMinutes >= 10) {
      return logAndRespond(
        `Bounty ${bountyId} not started yet, it will start at ${bounty.startsAt.toISOString()}`,
      );
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

    // Find groupIds
    const groupIds = bounty.groups.map(({ groupId }) => groupId);

    // Find program enrollments
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId: bounty.programId,
        ...(groupIds.length > 0 && {
          groupId: {
            in: groupIds,
          },
        }),
        ...(partnerIds && {
          partnerId: {
            in: partnerIds,
          },
        }),
        status: {
          in: ["approved", "invited"],
        },
      },
      select: {
        partnerId: true,
        totalCommissions: true,
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

    const existingSubmissions = await prisma.bountySubmission.findMany({
      where: {
        bountyId: bounty.id,
        partnerId: {
          in: partners.map((partner) => partner.id),
        },
        periodNumber: 1,
      },
      select: {
        id: true,
        partnerId: true,
        status: true,
      },
    });

    const { toCreate, toUpdate } = planDraftBountySubmissionUpserts({
      partners,
      existingSubmissions,
      condition,
      programId: bounty.programId,
      bountyId: bounty.id,
    });

    console.table(toCreate);
    console.table(toUpdate);

    const [createdBountySubmissions] = await Promise.all([
      toCreate.length > 0
        ? prisma.bountySubmission.createMany({
            data: toCreate,
            skipDuplicates: true,
          })
        : Promise.resolve({ count: 0 }),
      toUpdate.length > 0
        ? prisma.$transaction(
            toUpdate.map((update) =>
              prisma.bountySubmission.update({
                where: { id: update.id },
                data: {
                  performanceCount: update.performanceCount,
                  ...(update.promoteToSubmitted && {
                    status: "submitted",
                    completedAt: new Date(),
                  }),
                },
              }),
            ),
          )
        : Promise.resolve([]),
    ]);

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
