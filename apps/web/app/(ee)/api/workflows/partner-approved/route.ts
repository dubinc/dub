import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { createPartnerDefaultLinks } from "@/lib/api/partners/create-partner-default-links";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { createWorkflowLogger } from "@/lib/cron/qstash-workflow-logger";
import { PlanProps, RewardProps } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { EnrolledPartnerSchema } from "@/lib/zod/schemas/partners";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { resend } from "@dub/email/resend/client";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import PartnerApplicationApproved from "@dub/email/templates/partner-application-approved";
import { prisma } from "@dub/prisma";
import { serve } from "@upstash/workflow/nextjs";
import { z } from "zod";

const payloadSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
  userId: z.string(),
});

type Payload = z.infer<typeof payloadSchema>;

// TODO:
// Test each workflow step

// POST /api/workflows/partner-approved
export const { POST } = serve<Payload>(
  async (context) => {
    const input = context.requestPayload;
    const { programId, partnerId, userId } = input;

    const logger = createWorkflowLogger({
      workflowId: "partner-approved-1",
      workflowRunId: context.workflowRunId,
    });

    const { program, partner, links, ...programEnrollment } =
      await getProgramEnrollmentOrThrow({
        programId,
        partnerId,
        includePartner: true,
      });

    const { groupId } = programEnrollment;

    // Step 1: Create partner default links
    await context.run("create-default-links", async () => {
      logger.info({
        message: "Started executing workflow step 'create-default-links'.",
        data: input,
      });

      if (!groupId) {
        logger.error({
          message: `The partner ${partnerId} is not associated with any group.`,
        });
        return;
      }

      let { partnerGroupDefaultLinks, utmTemplate } =
        await prisma.partnerGroup.findUniqueOrThrow({
          where: {
            id: groupId,
          },
          include: {
            partnerGroupDefaultLinks: true,
            utmTemplate: true,
          },
        });

      if (partnerGroupDefaultLinks.length === 0) {
        logger.error({
          message: `Group ${groupId} does not have any default links.`,
        });
        return;
      }

      // Skip existing default links
      for (const link of links) {
        if (link.partnerGroupDefaultLinkId) {
          partnerGroupDefaultLinks = partnerGroupDefaultLinks.filter(
            (defaultLink) => defaultLink.id !== link.partnerGroupDefaultLinkId,
          );
        }
      }

      // Find the workspace
      const workspace = await prisma.project.findUniqueOrThrow({
        where: {
          id: program.workspaceId,
        },
        select: {
          id: true,
          plan: true,
        },
      });

      const partnerLinks = await createPartnerDefaultLinks({
        workspace: {
          id: workspace.id,
          plan: workspace.plan as PlanProps,
        },
        program: {
          id: program.id,
          defaultFolderId: program.defaultFolderId,
        },
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email!,
          tenantId: programEnrollment.tenantId ?? undefined,
        },
        group: {
          defaultLinks: partnerGroupDefaultLinks,
          utmTemplate: utmTemplate,
        },
        userId,
      });

      logger.info({
        message: `Created ${partnerLinks.length} partner default links.`,
        data: partnerLinks.map(({ id, url, shortLink }) => ({
          id,
          url,
          shortLink,
        })),
      });

      return;
    });

    // Step 2: Send email to partner application approved
    await context.run("send-email", async () => {
      logger.info({
        message: "Started executing workflow step 'send-email'.",
        data: input,
      });

      if (!groupId) {
        logger.error({
          message: `The partner ${partnerId} is not associated with any group.`,
        });
        return;
      }

      // Find the partner users to send email notification
      const partnerUsers = await prisma.partnerUser.findMany({
        where: {
          partnerId,
          notificationPreferences: {
            applicationApproved: true,
          },
          user: {
            email: {
              not: null,
            },
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
      });

      if (partnerUsers.length === 0) {
        logger.info({
          message: `No partner users found for partner ${partnerId} to send email notification.`,
        });
        return;
      }

      // Find the group to get the rewards
      const group = await getGroupOrThrow({
        programId,
        groupId,
        includeExpandedFields: true,
      });

      const rewards = [
        group.clickReward,
        group.leadReward,
        group.saleReward,
      ].filter(Boolean) as RewardProps[];

      logger.info({
        message: `Sending email notification to ${partnerUsers.length} partner users.`,
        data: partnerUsers,
      });

      // Resend batch email
      const { data, error } = await resend.batch.send(
        partnerUsers.map(({ user }) => ({
          subject: `Your application to join ${program.name} partner program has been approved!`,
          from: VARIANT_TO_FROM_MAP.notifications,
          to: user.email!,
          react: PartnerApplicationApproved({
            program: {
              name: program.name,
              logo: program.logo,
              slug: program.slug,
              supportEmail: program.supportEmail,
            },
            partner: {
              name: partner.name,
              email: user.email!,
              payoutsEnabled: Boolean(partner.payoutsEnabledAt),
            },
            rewardDescription: ProgramRewardDescription({
              reward: rewards.find((r) => r.event === "sale"),
              showModifiersTooltip: false,
            }),
          }),
          headers: {
            "Idempotency-Key": `application-approved-${programEnrollment.id}`,
          },
        })),
      );

      if (data) {
        logger.info({
          message: `Sent emails to ${partnerUsers.length} partner users.`,
          data: data,
        });
      }

      if (error) {
        throw new Error(`Failed to send email notification to partner users.`);
      }
    });

    // Step 3: Send webhook to workspace
    await context.run("send-webhook", async () => {
      logger.info({
        message: "Started executing workflow step 'send-webhook'.",
        data: input,
      });

      const enrolledPartner = EnrolledPartnerSchema.parse({
        ...programEnrollment,
        ...partner,
        id: partner.id,
        status: programEnrollment.status,
        links,
      });

      const workspace = await prisma.project.findUniqueOrThrow({
        where: {
          id: program.workspaceId,
        },
        select: {
          id: true,
          webhookEnabled: true,
        },
      });

      await sendWorkspaceWebhook({
        workspace,
        trigger: "partner.enrolled",
        data: enrolledPartner,
      });

      logger.info({
        message: `Sent "partner.enrolled" webhook to workspace ${workspace.id}.`,
      });
    });
  },
  {
    initialPayloadParser: (requestPayload) => {
      return payloadSchema.parse(JSON.parse(requestPayload));
    },
  },
);
