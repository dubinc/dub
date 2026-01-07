import { validateCampaignFromAddress } from "@/lib/api/campaigns/validate-campaign";
import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { renderCampaignEmailHTML } from "@/lib/api/workflows/render-campaign-email-html";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { TiptapNode } from "@/lib/types";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { sendBatchEmail } from "@dub/email";
import CampaignEmail from "@dub/email/templates/campaign-email";
import { prisma } from "@dub/prisma";
import { NotificationEmailType } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, chunk, log } from "@dub/utils";
import { differenceInMinutes } from "date-fns";
import { headers } from "next/headers";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  campaignId: z.string(),
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

// POST /api/cron/campaigns/broadcast
// Send marketing campaigns to partners in batches
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    let { campaignId, startingAfter, batchNumber } = schema.parse(
      JSON.parse(rawBody),
    );

    const campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
      },
      include: {
        groups: true,
        program: {
          include: {
            emailDomains: {
              where: {
                status: "verified",
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return logAndRespond(`Campaign ${campaignId} not found.`);
    }

    if (campaign.type !== "marketing") {
      return logAndRespond(
        `Campaign ${campaignId} is not a marketing campaign.`,
      );
    }

    if (!["scheduled", "sending"].includes(campaign.status)) {
      return logAndRespond(
        `Campaign ${campaignId} must be in "sending" or "scheduled" status to broadcast.`,
      );
    }

    // This is a safety check to ensure the campaign is not scheduled to broadcast too far in the future
    // Ideally this should not happen but just in case
    if (campaign.scheduledAt) {
      const diffMinutes = differenceInMinutes(campaign.scheduledAt, new Date());

      if (diffMinutes >= 5) {
        await log({
          message: `Campaign ${campaignId} broadcast was skipped because it is scheduled to broadcast in the future. This might be an error in the campaign scheduling.`,
          type: "errors",
        });

        return logAndRespond(
          `Campaign ${campaignId} is not scheduled to broadcast yet.`,
        );
      }
    }

    // This is a safety check to ensure the campaign broadcast is not "initiated" multiple times
    const headersList = await headers();
    const upstashMessageId = headersList.get("Upstash-Message-Id");

    if (
      !startingAfter && // First run
      campaign.qstashMessageId &&
      upstashMessageId !== campaign.qstashMessageId
    ) {
      return logAndRespond(
        `Campaign ${campaignId} broadcast was skipped because it is not the current message being processed.`,
      );
    }

    const program = campaign.program;

    // TODO: We should make the from address required. There are existing campaign without from address
    if (campaign.from) {
      validateCampaignFromAddress({
        campaign,
        emailDomains: program.emailDomains,
      });
    }

    // Mark the campaign as sending
    try {
      await prisma.campaign.update({
        where: {
          id: campaignId,
          status: "scheduled",
        },
        data: {
          status: "sending",
        },
      });
    } catch (error) {
      //
    }

    const campaignGroupIds = campaign.groups.map(({ groupId }) => groupId);

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId: campaign.programId,
        status: {
          in: ACTIVE_ENROLLMENT_STATUSES,
        },
        ...(campaignGroupIds.length > 0 && {
          groupId: {
            in: campaignGroupIds,
          },
        }),
      },
      select: {
        id: true,
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
            users: {
              where: {
                notificationPreferences: {
                  marketingCampaign: true,
                },
              },
              select: {
                user: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
              },
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

    const partnerUsers = programEnrollments.flatMap((enrollment) =>
      enrollment.partner.users
        .filter(({ user }) => user.email)
        .map(({ user }) => ({
          ...user,
          partner: {
            ...enrollment.partner,
            users: undefined,
          },
          enrollment: {
            ...enrollment,
            partner: undefined,
          },
        })),
    );

    console.table(
      partnerUsers.map((partnerUser) => ({
        id: partnerUser.partner.id,
        name: partnerUser.partner.name,
        email: partnerUser.email,
      })),
    );

    if (partnerUsers.length > 0) {
      // Chunk partnerUsers even though the DB query limits enrollments to EMAIL_BATCH_SIZE.
      // Each enrollment can have multiple users (via partner.users), so the flattened
      // partnerUsers array can exceed EMAIL_BATCH_SIZE.
      const partnerUsersChunks = chunk(partnerUsers, EMAIL_BATCH_SIZE);

      for (
        let chunkIndex = 0;
        chunkIndex < partnerUsersChunks.length;
        chunkIndex++
      ) {
        const partnerUsersChunk = partnerUsersChunks[chunkIndex].filter(
          (partnerUser) => partnerUser.email,
        );
        const batchIdentifier = startingAfter || "initial";
        const idempotencyKey = `campaign-broadcast/${campaign.id}-${batchIdentifier}-${chunkIndex}`;

        const { data, error } = await sendBatchEmail(
          partnerUsersChunk.map((partnerUser) => ({
            from: `${program.name} <${campaign.from}>`,
            to: partnerUser.email!,
            subject: campaign.subject,
            ...(program.supportEmail ? { replyTo: program.supportEmail } : {}),
            react: CampaignEmail({
              program: {
                name: program.name,
                slug: program.slug,
                logo: program.logo,
              },
              campaign: {
                type: campaign.type,
                preview: campaign.preview,
                body: renderCampaignEmailHTML({
                  content: campaign.bodyJson as unknown as TiptapNode,
                  variables: {
                    PartnerName: partnerUser.partner.name,
                    PartnerEmail: partnerUser.partner.email,
                  },
                }),
              },
            }),
            tags: [{ name: "type", value: "notification-email" }],
          })),
          {
            idempotencyKey,
          },
        );

        if (error) {
          console.error(error);
        }

        if (data) {
          await prisma.notificationEmail.createMany({
            data: partnerUsersChunk.map((partnerUser, idx) => ({
              id: createId({ prefix: "em_" }),
              type: NotificationEmailType.Campaign,
              emailId: data.data[idx].id,
              campaignId: campaign.id,
              programId: campaign.programId,
              partnerId: partnerUser.partner.id,
              recipientUserId: partnerUser.id,
            })),
            skipDuplicates: true,
          });
        }
      }
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
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/campaigns/broadcast`,
        method: "POST",
        delay,
        body: {
          campaignId,
          startingAfter,
          batchNumber: batchNumber + 1,
        },
      });

      return logAndRespond(
        `Enqueued next page (${startingAfter}) for campaign ${campaignId} to run after ${delay} seconds.`,
      );
    }

    // Mark the campaign as sent
    try {
      await prisma.campaign.update({
        where: {
          id: campaignId,
          status: "sending",
        },
        data: {
          status: "sent",
        },
      });
    } catch (error) {
      //
    }

    return logAndRespond(`Finished broadcasting campaign ${campaignId}.`);
  } catch (error) {
    await log({
      message: "Campaign broadcast cron failed. Error: " + error.message,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
