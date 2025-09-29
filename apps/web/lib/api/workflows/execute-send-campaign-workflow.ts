import { WorkflowCondition, WorkflowContext } from "@/lib/types";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { sendBatchEmail } from "@dub/email";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import { NotificationEmailType, Workflow } from "@prisma/client";
import { subDays } from "date-fns";
import { createId } from "../create-id";
import { parseWorkflowConfig } from "./parse-workflow-config";

export const executeSendCampaignWorkflow = async ({
  workflow,
  context,
}: {
  workflow: Workflow;
  context?: WorkflowContext;
}) => {
  const { condition, action } = parseWorkflowConfig(workflow);

  if (action.type !== WORKFLOW_ACTION_TYPES.SendCampaign) {
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
    },
  });

  if (!campaign) {
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

  const alreadySentPartnerIds = new Set(
    alreadySentEmails.map(({ partnerId }) => partnerId),
  );

  // Exclude partners who already got the campaign
  programEnrollments = programEnrollments.filter(
    ({ partnerId }) => !alreadySentPartnerIds.has(partnerId),
  );

  if (programEnrollments.length === 0) {
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
    await prisma.message.createMany({
      data: programEnrollmentChunk.map((programEnrollment) => ({
        id: createId({ prefix: "msg_" }),
        programId: programEnrollment.programId,
        partnerId: programEnrollment.partnerId,
        senderUserId: campaign.userId,
        text: renderEmailTemplate({
          template: campaign.body,
          variables: {
            name: programEnrollment.partner.name,
          },
        }),
      })),
    });

    // Send emails
    const { data } = await sendBatchEmail(
      partnerUsers.map((partnerUser) => ({
        variant: "notifications",
        to: partnerUser.email!,
        subject: campaign.subject,
        react: renderEmailTemplate({
          template: campaign.body,
          variables: {
            name: partnerUser.name,
          },
        }),
        tags: [{ name: "type", value: "notification-email" }],
        headers: {
          "Idempotency-Key": `${campaign.id}-${partnerUser.id}`,
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
      });
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

function renderEmailTemplate({
  template,
  variables,
}: {
  template: string;
  variables: Record<string, string | number | null | undefined>;
}): string {
  return template.replace(
    /{{\s*([\w.]+)(?:\|([^}]+))?\s*}}/g,
    (_, key, fallback) => {
      const value = variables[key];
      return value != null ? String(value) : fallback ?? "";
    },
  );
}
