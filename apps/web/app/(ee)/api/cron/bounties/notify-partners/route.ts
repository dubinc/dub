import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import NewBountyAvailable from "@dub/email/templates/new-bounty-available";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, chunk, log } from "@dub/utils";
import { differenceInMinutes } from "date-fns";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  bountyId: z.string(),
  page: z.number().optional().default(0),
});

const MAX_PAGE_SIZE = 5000;

// POST /api/cron/bounties/notify-partners
// Send emails to eligible partners about new bounty that is published
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { bountyId, page } = schema.parse(JSON.parse(rawBody));

    // Find bounty
    const bounty = await prisma.bounty.findUnique({
      where: {
        id: bountyId,
      },
      include: {
        groups: true,
        program: true,
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

    // Find groupIds
    const groupIds = bounty.groups.map(({ groupId }) => groupId);
    console.log(
      `Bounty ${bountyId} is applicable to ${
        groupIds.length === 0 ? "all" : groupIds.length
      } groups (groupIds: ${JSON.stringify(groupIds)})`,
    );

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId: bounty.programId,
        ...(groupIds.length > 0 && {
          groupId: {
            in: groupIds,
          },
        }),
        status: {
          in: ["approved", "invited"],
        },
        partner: {
          email: {
            not: null,
          },
        },
      },
      include: {
        partner: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      skip: page * MAX_PAGE_SIZE,
      take: MAX_PAGE_SIZE,
    });

    if (programEnrollments.length === 0) {
      return logAndRespond(
        `No program enrollments found for bounty ${bountyId}.`,
      );
    }

    const programEnrollmentChunks = chunk(programEnrollments, 100);

    for (const programEnrollmentChunk of programEnrollmentChunks) {
      console.log(
        `Sending emails to ${programEnrollmentChunk.length} partners: ${programEnrollmentChunk.map(({ partner }) => partner.email).join(", ")}`,
      );
      await resend?.batch.send(
        programEnrollmentChunk.map(({ partner }) => ({
          from: VARIANT_TO_FROM_MAP.notifications,
          to: partner.email!, // coerce the type here because we've already filtered out partners with no email in the prisma query
          subject: `New bounty available for ${bounty.program.name}`,
          react: NewBountyAvailable({
            email: partner.email!,
            bounty: {
              name: bounty.name,
              type: bounty.type,
              endsAt: bounty.endsAt,
              description: bounty.description,
            },
            program: {
              name: bounty.program.name,
              slug: bounty.program.slug,
            },
          }),
          headers: {
            "Idempotency-Key": `${bountyId}-${partner.id}`,
          },
        })),
      );
    }

    if (programEnrollments.length === MAX_PAGE_SIZE) {
      const res = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/notify-partners`,
        body: {
          bountyId,
          page: page + 1,
        },
      });

      return logAndRespond(
        `Enqueued next page (${page + 1}) for bounty ${bountyId}. ${JSON.stringify(res, null, 2)}`,
      );
    }

    return logAndRespond(
      `Finished sending emails to ${programEnrollments.length} partners for bounty ${bountyId}.`,
    );
  } catch (error) {
    await log({
      message: "New bounties published cron failed. Error: " + error.message,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
