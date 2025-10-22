import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { renderCampaignEmailHTML } from "@/lib/api/workflows/render-campaign-email-html";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { TiptapNode } from "@/lib/types";
import { sendBatchEmail } from "@dub/email";
import CampaignEmail from "@dub/email/templates/campaign-email";
import { prisma } from "@dub/prisma";
import { NotificationEmailType } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const MAX_PARTNERS_SIZE = 100;

const schema = z.object({
  campaignId: z.string(),
  startingAfter: z.string().optional(),
});

// POST /api/cron/campaigns/broadcast
// Send marketing campaigns to partners in batches
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { campaignId, startingAfter } = schema.parse(JSON.parse(rawBody));

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

    if (!["sending", "scheduled"].includes(campaign.status)) {
      return logAndRespond(
        `Campaign ${campaignId} must be in "sending" or "scheduled" status to broadcast.`,
      );
    }

    const program = campaign.program;
    const emailDomain = program.emailDomains.find(
      ({ fromAddress, status }) =>
        fromAddress === campaign.from && status === "verified",
    );

    if (!emailDomain) {
      return logAndRespond(
        `No verified email domain found for program ${program.id}.`,
      );
    }

    // Mark the campaign as sending
    if (campaign.status === "scheduled") {
      await prisma.campaign.update({
        where: {
          id: campaignId,
        },
        data: {
          status: "sending",
        },
      });
    }

    const campaignGroupIds = campaign.groups.map(({ groupId }) => groupId);

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId: campaign.programId,
        status: "approved",
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
      take: MAX_PARTNERS_SIZE,
      skip: startingAfter ? 1 : 0,
      ...(startingAfter && {
        cursor: {
          id: startingAfter,
        },
      }),
      orderBy: {
        createdAt: "asc",
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
      const { data } = await sendBatchEmail(
        partnerUsers.map((partnerUser) => ({
          variant: "marketing",
          from: `${program.name} <${emailDomain.fromAddress}>`,
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
              subject: campaign.subject,
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
          headers: {
            "Idempotency-Key": `${campaign.id}-${startingAfter}`,
          },
        })),
      );

      if (data) {
        await prisma.notificationEmail.createMany({
          data: partnerUsers.map((partnerUser, idx) => ({
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

    if (programEnrollments.length === MAX_PARTNERS_SIZE) {
      const nextStartingAfter =
        programEnrollments[programEnrollments.length - 1].id;

      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/campaigns/broadcast`,
        method: "POST",
        body: {
          campaignId,
          startingAfter: nextStartingAfter,
        },
      });

      return logAndRespond(
        `Enqueued next page (${nextStartingAfter}) for campaign ${campaignId}.`,
      );
    }

    // Mark the campaign as sent
    if (campaign.status === "sending") {
      await prisma.campaign.update({
        where: {
          id: campaignId,
        },
        data: {
          status: "sent",
        },
      });
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
