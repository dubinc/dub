import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import NewBountyAvailable from "@dub/email/templates/new-bounty-available";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { differenceInMinutes } from "date-fns";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  bountyId: z.string(),
  page: z.number().optional().default(0),
});

const PAGE_SIZE = 100;

// POST /api/cron/bounties/published
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

    // Find programEnrollments
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
      },
      include: {
        partner: true,
      },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    });

    if (programEnrollments.length === 0) {
      return logAndRespond(
        page === 1
          ? `No program enrollments found for bounty ${bountyId}.`
          : `No more program enrollments found for bounty ${bountyId}.`,
      );
    }

    console.log(
      `Sending emails to ${programEnrollments.length} partners: ${programEnrollments.map(({ partner }) => partner.email).join(", ")}`,
    );
    await resend?.batch.send(
      programEnrollments
        .filter(({ partner }) => partner.email)
        .map(({ partner }) => ({
          from: VARIANT_TO_FROM_MAP.notifications,
          to: partner.email!,
          subject: `New bounty available for ${bounty.program.name}`,
          react: NewBountyAvailable({
            email: partner.email!,
            bounty: {
              name: bounty.name!,
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

    // Trigger next page
    const nextPage = page + 1;
    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/published`,
      body: {
        bountyId,
        page: nextPage,
      },
    });

    return logAndRespond(`Triggered cron for next page ${nextPage}.`);
  } catch (error) {
    await log({
      message: "New bounties published cron failed. Error: " + error.message,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
