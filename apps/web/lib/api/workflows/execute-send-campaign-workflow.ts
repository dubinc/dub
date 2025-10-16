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
import { chunk } from "@dub/utils";
import { NotificationEmailType, Workflow } from "@prisma/client";
import { differenceInDays, subDays } from "date-fns";
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
      program: true,
      groups: true,
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

  console.log(
    `Found ${programEnrollments.length} program enrollments to send campaign emails to.`,
  );

  if (programEnrollments.length === 0) {
    return;
  }

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

    const { program } = campaign;

    // Send emails
    const { data } = await sendBatchEmail(
      partnerUsers.map((partnerUser) => ({
        variant: "notifications",
        to: partnerUser.email!,
        subject: campaign.subject,
        react: CampaignEmail({
          program: {
            name: program.name,
            slug: program.slug,
            logo: program.logo,
            messagingEnabledAt: program.messagingEnabledAt,
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
  const { attribute } = condition;

  if (partnerId) {
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
        partner: {
          include: {
            users: {
              include: {
                user: true,
              },
            },
          },
        },
        links: {
          select: {
            clicks: true,
            leads: true,
            conversions: true,
            sales: true,
            saleAmount: true,
          },
        },
      },
    });

    if (!programEnrollment) {
      return [];
    }

    const context: Partial<Record<WorkflowConditionAttribute, number | null>> =
      {
        ...aggregatePartnerLinksStats(programEnrollment.links),
        partnerJoined: differenceInDays(
          new Date(),
          programEnrollment.createdAt,
        ),
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
      ...buildEnrollmentWhere(condition),
    },
    include: {
      partner: {
        include: {
          users: {
            include: {
              user: true,
            },
          },
        },
      },
    },
    take: 50,
  });
}

function buildEnrollmentWhere(condition: WorkflowCondition) {
  switch (condition.attribute) {
    case "totalClicks":
    case "totalLeads":
    case "totalConversions":
    case "totalSales":
    case "totalSaleAmount":
    case "totalCommissions":
      return {
        [condition.attribute]: {
          gte: condition.value,
        },
      };
    case "partnerEnrolledDays":
    case "partnerJoined":
      return {
        createdAt: {
          lte: subDays(new Date(), condition.value),
        },
      };
  }
}
