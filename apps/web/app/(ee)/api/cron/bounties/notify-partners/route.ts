import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { sendBatchEmail } from "@dub/email";
import NewBountyAvailable from "@dub/email/templates/new-bounty-available";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { NotificationEmailType } from "@prisma/client";
import { differenceInMinutes } from "date-fns";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  bountyId: z.string(),
  startingAfter: z.string().optional(),
  batchNumber: z
    .number()
    .optional()
    .default(1)
    .describe("Keep track of the batches sent."),
});

const EMAIL_BATCH_SIZE = 100; // Batch size
const BATCH_DELAY_SECONDS = 2; // Delay between batches
const EXTENDED_DELAY_SECONDS = 30; // Extended delay after 25 batches
const EXTENDED_DELAY_INTERVAL = 25; // Number of batches after which to extend the delay

// POST /api/cron/bounties/notify-partners
// Send emails to eligible partners about new bounty that is published
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    let { bountyId, startingAfter, batchNumber } = schema.parse(
      JSON.parse(rawBody),
    );

    // Find bounty
    const bounty = await prisma.bounty.findUnique({
      where: {
        id: bountyId,
      },
      include: {
        groups: true,
        program: {
          include: {
            emailDomains: true,
          },
        },
      },
    });

    if (!bounty) {
      return logAndRespond(`Bounty ${bountyId} not found.`, {
        logLevel: "error",
      });
    }

    const diffMinutes = differenceInMinutes(bounty.startsAt, new Date());

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
          // only notify partners who have signed up for an account on partners.dub.co
          users: {
            some: {},
          },
        },
      },
      include: {
        partner: {
          include: {
            users: {
              take: 1, // TODO: update this to use partnerUsersToNotify approach
            },
          },
        },
      },
      take: EMAIL_BATCH_SIZE,
      skip: startingAfter ? 1 : 0,
      ...(startingAfter && {
        cursor: {
          id: startingAfter,
        },
      }),
      orderBy: {
        id: "asc",
      },
    });

    if (programEnrollments.length === 0) {
      return logAndRespond(
        `No more program enrollments found for bounty ${bountyId}.`,
      );
    }

    console.log(
      `Sending emails to ${programEnrollments.length} partners: ${programEnrollments.map(({ partner }) => partner.email).join(", ")}`,
    );

    const verifiedEmailDomain = bounty.program.emailDomains.find(
      ({ status }) => status === "verified",
    )?.slug;

    const { data } = await sendBatchEmail(
      programEnrollments.map(({ partner }) => ({
        variant: "notifications",
        from: verifiedEmailDomain
          ? `${bounty.program.name} <bounties@${verifiedEmailDomain}>`
          : undefined,
        to: partner.email!, // coerce the type here because we've already filtered out partners with no email in the prisma query
        subject: `New bounty available for ${bounty.program.name}`,
        replyTo: bounty.program.supportEmail || "noreply",
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
        tags: [{ name: "type", value: "notification-email" }],
      })),
      {
        idempotencyKey: `bounty-notify/${bountyId}-${startingAfter || "initial"}`,
      },
    );

    if (data) {
      await prisma.notificationEmail.createMany({
        data: programEnrollments.map(({ partner }, idx) => ({
          id: createId({ prefix: "em_" }),
          type: NotificationEmailType.Bounty,
          emailId: data.data[idx].id,
          bountyId: bounty.id,
          programId: bounty.programId,
          partnerId: partner.id,
          recipientUserId: partner.users[0].userId, // TODO: update this to use partnerUsersToNotify approach
        })),
      });
    }

    if (programEnrollments.length === EMAIL_BATCH_SIZE) {
      startingAfter = programEnrollments[programEnrollments.length - 1].id;

      // Add BATCH_DELAY_SECONDS pause between each batch, and a longer EXTENDED_DELAY_SECONDS cooldown after every EXTENDED_DELAY_INTERVAL batches.
      let delay = 0;
      if (batchNumber > 0 && batchNumber % EXTENDED_DELAY_INTERVAL === 0) {
        delay = EXTENDED_DELAY_SECONDS;
      } else {
        delay = BATCH_DELAY_SECONDS;
      }

      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/notify-partners`,
        method: "POST",
        delay,
        body: {
          bountyId,
          startingAfter,
          batchNumber: batchNumber + 1,
        },
      });

      return logAndRespond(
        `Enqueued next batch (${startingAfter}) for bounty ${bountyId} to run after ${delay} seconds.`,
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
