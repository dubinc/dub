import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import NewBountyAvailable from "@dub/email/templates/new-bounty-available";
import { prisma } from "@dub/prisma";
import { chunk, log } from "@dub/utils";
import { differenceInMinutes } from "date-fns";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  bountyId: z.string(),
  page: z.number().optional().default(0),
});

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

    let totalProgramEnrollments = 0;
    while (true) {
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
        skip: totalProgramEnrollments,
        take: 5000,
      });

      if (programEnrollments.length === 0) {
        break;
      }

      totalProgramEnrollments += programEnrollments.length;

      const programEnrollmentChunks = chunk(programEnrollments, 100);

      for (const programEnrollmentChunk of programEnrollmentChunks) {
        console.log(
          `Sending emails to ${programEnrollmentChunk.length} partners: ${programEnrollmentChunk.map(({ partner }) => partner.email).join(", ")}`,
        );
        await resend?.batch.send(
          programEnrollmentChunk
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

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return logAndRespond(
      `Successfully sent bounty notification emails to ${totalProgramEnrollments} partners.`,
    );
  } catch (error) {
    await log({
      message: "New bounties published cron failed. Error: " + error.message,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
