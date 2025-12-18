import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { evaluateWorkflowCondition } from "@/lib/api/workflows/execute-workflows";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { workflowConditionSchema } from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { differenceInMinutes } from "date-fns";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  bountyId: z.string(),
  partnerIds: z.array(z.string()).optional(),
  page: z.number().optional().default(0),
});

const MAX_PAGE_SIZE = 100;

// POST /api/cron/bounties/create-draft-submissions
// Create draft bounty submissions for performance bounties with lifetime performance scope
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
      .array(workflowConditionSchema)
      .parse(bounty.workflow.triggerConditions)[0];

    // Partners with their link metrics
    const partners = programEnrollments.map((partner) => {
      return {
        id: partner.partnerId,
        ...aggregatePartnerLinksStats(partner.links),
        totalCommissions: partner.totalCommissions,
      };
    });

    const bountySubmissionsToCreate: Prisma.BountySubmissionCreateManyInput[] =
      partners
        // only create submissions for partners that have at least 1 performanceCount
        .filter((partner) => partner[condition.attribute] > 0)
        .map((partner) => {
          const performanceCount = partner[condition.attribute];

          const conditionMet = evaluateWorkflowCondition({
            condition,
            attributes: {
              [condition.attribute]: performanceCount,
            },
          });

          return {
            id: createId({ prefix: "bnty_sub_" }),
            programId: bounty.programId,
            partnerId: partner.id,
            bountyId: bounty.id,
            performanceCount,
            // If the condition is met, automatically submit the submission
            ...(conditionMet && {
              status: "submitted",
              completedAt: new Date(),
            }),
          };
        });

    console.table(bountySubmissionsToCreate);

    // Create bounty submissions
    const createdBountySubmissions = await prisma.bountySubmission.createMany({
      data: bountySubmissionsToCreate,
      skipDuplicates: true,
    });

    console.log(
      `Created ${createdBountySubmissions.count} bounty submissions for bounty ${bountyId}.`,
    );

    if (programEnrollments.length === MAX_PAGE_SIZE) {
      const response = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/create-draft-submissions`,
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
      `Finished creating submissions for ${createdBountySubmissions.count} partners for bounty ${bountyId}.`,
    );
  } catch (error) {
    await log({
      message: "New bounties submissions cron failed. Error: " + error.message,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
