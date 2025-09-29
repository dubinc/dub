import { WorkflowCondition, WorkflowContext } from "@/lib/types";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { sendBatchEmail } from "@dub/email";
import NewMessageFromProgram from "@dub/email/templates/new-message-from-program";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import { NotificationEmailType, Workflow } from "@prisma/client";
import { subDays } from "date-fns";
import { createId } from "../create-id";
import { parseWorkflowConfig } from "./parse-workflow-config";
import { renderEmailTemplate } from "./render-email-template";

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

  let programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId,
      partnerId,
      status: "approved",
      ...(campaign.groups.length > 0 && {
        groupId: {
          in: campaign.groups.map(({ groupId }) => groupId),
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
  });

  if (programEnrollments.length === 0) {
    console.log(
      `Workflow ${workflow.id} no program enrollments found for campaign ${campaignId}.`,
    );
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
    // Get partner users to notify
    const partnerUsers = programEnrollmentChunk.flatMap((enrollment) =>
      enrollment.partner.users.map(({ user }) => ({
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
        text: renderEmailTemplate({
          template: campaign.body,
          variables: {
            partnerName: programEnrollment.partner.name,
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
        to: partnerUser.email!,
        subject: campaign.subject,
        react: NewMessageFromProgram({
          program: {
            name: campaign.program.name,
            logo: campaign.program.logo,
            slug: campaign.program.slug,
          },
          messages: [
            {
              text: renderEmailTemplate({
                template: campaign.body,
                variables: {
                  partnerName: partnerUser.partner.name,
                },
              }),
              createdAt: new Date(),
              user: {
                name: campaign.program.name,
                image: campaign.program.logo,
              },
            },
          ],
          email: partnerUser.email!,
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

function buildEnrollmentWhere(condition: WorkflowCondition) {
  const thresholdDate = subDays(new Date(), condition.value);

  switch (condition.operator) {
    case "gte":
      return {
        createdAt: {
          lte: thresholdDate,
        },
      };
  }
}
