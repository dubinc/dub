import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import {
  TiptapNode,
  WorkflowCondition,
  WorkflowConditionAttribute,
  WorkflowContext,
} from "@/lib/types";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { sendBatchEmail } from "@dub/email";
import CampaignEmail from "@dub/email/templates/campaign-email";
import { prisma } from "@dub/prisma";
import { NotificationEmailType, Prisma, Workflow } from "@dub/prisma/client";
import { chunk } from "@dub/utils";
import { addHours, differenceInDays, subDays } from "date-fns";
import { validateCampaignFromAddress } from "../campaigns/validate-campaign";
import { createId } from "../create-id";
import { evaluateWorkflowCondition } from "./execute-workflows";
import { parseWorkflowConfig } from "./parse-workflow-config";
import { renderCampaignEmailHTML } from "./render-campaign-email-html";
import { renderCampaignEmailMarkdown } from "./render-campaign-email-markdown";

export const executeSendCampaignWorkflow = async ({
  workflow,
  context,
}: {
  workflow: Workflow;
  context?: WorkflowContext;
}) => {
  const { condition, action } = parseWorkflowConfig(workflow);

  if (action.type !== WORKFLOW_ACTION_TYPES.SendCampaign) {
    console.log(
      `Workflow ${workflow.id} is not a send campaign workflow: ${action.type}`,
    );
    return;
  }

  const { campaignId } = action.data;
  const { programId, partnerId } = context || {
    programId: workflow.programId,
    partnerId: undefined,
  };

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
    console.log(`Workflow ${workflow.id} campaign ${campaignId} not found.`);
    return;
  }

  if (campaign.status !== "active") {
    console.log(`Campaign ${campaignId} is not active.`);
    return;
  }

  let programEnrollments = await getProgramEnrollments({
    programId,
    partnerId,
    groupIds: campaign.groups.map(({ groupId }) => groupId),
    condition,
  });

  if (programEnrollments.length === 0) {
    console.log(
      `Workflow ${workflow.id} no program enrollments found to send campaign emails to, skipping...`,
    );
    return;
  }

  console.log(
    `Found ${programEnrollments.length} program enrollments to send campaign emails to.`,
  );

  // Fetch already-sent campaign emails for these partners to prevent duplicates
  const alreadySentEmails = await prisma.notificationEmail.findMany({
    where: {
      campaignId: campaign.id,
      type: "Campaign",
      partnerId: {
        in: programEnrollments.map(({ partnerId }) => partnerId),
      },
    },
    select: {
      partnerId: true,
    },
  });

  if (alreadySentEmails.length > 0) {
    console.log(
      `Workflow ${workflow.id} already sent campaign emails to ${alreadySentEmails.length} partners: ${alreadySentEmails.map(({ partnerId }) => partnerId).join(", ")}`,
    );
  }

  const alreadySentPartnerIds = new Set(
    alreadySentEmails.map(({ partnerId }) => partnerId),
  );

  // Exclude partners who already got the campaign
  programEnrollments = programEnrollments.filter(
    ({ partnerId }) => !alreadySentPartnerIds.has(partnerId),
  );

  if (programEnrollments.length === 0) {
    console.log(
      `Workflow ${workflow.id} no program enrollments left to send campaign emails to.`,
    );
    return;
  }

  const program = campaign.program;

  // TODO: We should make the from address required. There are existing campaign without from adress
  if (campaign.from) {
    validateCampaignFromAddress({
      campaign,
      emailDomains: program.emailDomains,
    });
  }

  const programEnrollmentsChunks = chunk(programEnrollments, 100);

  for (const programEnrollmentChunk of programEnrollmentsChunks) {
    const partnerUsers = programEnrollmentChunk.flatMap((enrollment) =>
      enrollment.partner.users
        .filter(({ user }) => user.email) // only include users with an email
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

    // Create messages
    const messages = await prisma.message.createMany({
      data: programEnrollmentChunk.map((programEnrollment) => ({
        id: createId({ prefix: "msg_" }),
        programId: programEnrollment.programId,
        partnerId: programEnrollment.partnerId,
        senderUserId: campaign.userId,
        type: "campaign",
        subject: campaign.subject,
        text: renderCampaignEmailMarkdown({
          content: campaign.bodyJson as unknown as TiptapNode,
          variables: {
            PartnerName: programEnrollment.partner.name,
            PartnerEmail: programEnrollment.partner.email,
          },
        }),
      })),
    });

    console.log(
      `Workflow ${workflow.id} created ${messages.count} messages for campaign ${campaignId}.`,
    );

    // Send emails
    const { data } = await sendBatchEmail(
      partnerUsers.map((partnerUser) => ({
        variant: "notifications",
        ...(campaign.from ? { from: campaign.from } : {}),
        to: partnerUser.email!,
        subject: campaign.subject,
        replyTo: program.supportEmail || "noreply",
        react: CampaignEmail({
          program: {
            name: program.name,
            slug: program.slug,
            logo: program.logo,
            messagingEnabledAt: program.messagingEnabledAt,
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
        headers: {
          "Idempotency-Key": `${campaign.id}-${partnerUser.id}`,
        },
      })),
    );

    console.log(
      `Workflow ${workflow.id} sent ${data?.data.length} emails for campaign ${campaignId}.`,
    );

    if (data) {
      const notificationEmails = await prisma.notificationEmail.createMany({
        data: partnerUsers.map((partnerUser, idx) => ({
          id: createId({ prefix: "em_" }),
          type: NotificationEmailType.Campaign,
          emailId: data.data[idx].id,
          campaignId: campaign.id,
          programId: campaign.programId,
          partnerId: partnerUser.partner.id,
          recipientUserId: partnerUser.id,
        })),
      });

      console.log(
        `Workflow ${workflow.id} created ${notificationEmails.count} notification emails for campaign ${campaignId}.`,
      );
    }
  }
};

const includePartnerUsers = {
  partner: {
    include: {
      users: {
        include: {
          user: true,
        },
      },
    },
  },
} satisfies Prisma.ProgramEnrollmentInclude;

async function getProgramEnrollments({
  programId,
  partnerId,
  groupIds,
  condition,
}: {
  programId: string;
  partnerId?: string;
  groupIds: string[];
  condition: WorkflowCondition;
}) {
  if (partnerId) {
    const { attribute } = condition;

    const isPartnerLinkStatsAttribute = [
      "totalLeads",
      "totalConversions",
      "totalSaleAmount",
    ].includes(attribute);

    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
        status: "approved",
        ...(groupIds.length > 0 && {
          groupId: {
            in: groupIds,
          },
        }),
      },
      include: {
        ...includePartnerUsers,
        ...(isPartnerLinkStatsAttribute ? { links: true } : {}),
      },
    });

    if (!programEnrollment) {
      return [];
    }

    const context: Partial<Record<WorkflowConditionAttribute, number | null>> =
      {
        ...(isPartnerLinkStatsAttribute
          ? aggregatePartnerLinksStats(programEnrollment.links)
          : {}),
        ...(attribute === "totalCommissions"
          ? {
              totalCommissions:
                (
                  await prisma.commission.aggregate({
                    where: {
                      earnings: { not: 0 },
                      programId,
                      partnerId,
                      status: { in: ["pending", "processed", "paid"] },
                    },
                    _sum: { earnings: true },
                  })
                )._sum.earnings || 0,
            }
          : {}),
        ...(attribute === "partnerJoined"
          ? {
              partnerJoined: differenceInDays(
                new Date(),
                programEnrollment.createdAt,
              ),
            }
          : {}),
      };

    const shouldExecute = evaluateWorkflowCondition({
      condition,
      attributes: {
        [condition.attribute]: context[condition.attribute],
      },
    });

    if (!shouldExecute) {
      return [];
    }

    return [programEnrollment];
  }

  const startDate = subDays(new Date(), condition.value);
  // add 12 hours to the start date since we run the partnerEnrolled workflow every 12 hours
  const endDate = addHours(startDate, 12);

  // We need to get all program enrollments that match the condition for the scheduled workflows
  return await prisma.programEnrollment.findMany({
    where: {
      programId,
      status: "approved",
      ...(groupIds.length > 0 && {
        groupId: {
          in: groupIds,
        },
      }),
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: includePartnerUsers,
    take: 1000, // rough estimate that a program cannot get more than 1000 enrollments every 12 hours
  });
}
