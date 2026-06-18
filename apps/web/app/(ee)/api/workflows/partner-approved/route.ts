import { createPartnerDefaultLinks } from "@/lib/api/partners/create-partner-default-links";
import { getGroupRewardsAndBounties } from "@/lib/api/partners/get-group-rewards-and-bounties";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { logger } from "@/lib/axiom/server";
import { triggerDraftBountySubmissionCreation } from "@/lib/bounty/api/trigger-draft-bounty-submissions";
import { getWorkflowConfig } from "@/lib/cron/qstash-workflow";
import { generateDiscountCodeForPartner } from "@/lib/discounts/generate-discount-code-for-partner";
import { createReferralCommission } from "@/lib/partner-referrals/create-referral-commission";
import { prisma } from "@/lib/prisma";
import { polyfillSocialMediaFields } from "@/lib/social-utils";
import { PlanProps } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { EnrolledPartnerSchema } from "@/lib/zod/schemas/partners";
import { ProgramPartnerLinkSchema } from "@/lib/zod/schemas/programs";
import { sendBatchEmail } from "@dub/email";
import PartnerApplicationApproved from "@dub/email/templates/partner-application-approved";
import { NETWORK_PROGRAM_ID } from "@dub/utils";
import { serve } from "@upstash/workflow/nextjs";
import * as z from "zod/v4";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
  userId: z.string(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Partner Approved Workflow
 *
 * This workflow is triggered when a partner's application to join a program is approved.
 * It performs the following steps in sequence:
 *
 * 1. **Create Default Links**: Creates partner-specific default links based on the group's
 *    configuration.
 *
 * 2. **Create Discount Codes**: If the group's discount has auto-provisioning enabled,
 *    creates a discount code for the partner.
 *
 * 3. **Send Email Notification**: Sends an approval email to all partner users who have
 *    opted in to receive application approval notifications.
 *
 * 4. **Send Webhook**: Notifies the workspace via webhook that a new partner has been
 *    enrolled in the program.
 *
 * 5. **Trigger Draft Bounty Submission Creation**: Triggers the creation of
 *    draft bounty submissions for the partner if they are eligible for performance bounties.
 *
 * 6. **Execute Dub Workflows**: Executes Dub workflows using the “partnerEnrolled” trigger.
 */

// POST /api/workflows/partner-approved
export const { POST } = serve<Input>(
  async (context) => {
    const input = context.requestPayload;
    const { programId, partnerId, userId } = input;

    const {
      program,
      partner,
      links: existingPartnerLinks,
      ...programEnrollment
    } = await getProgramEnrollmentOrThrow({
      programId,
      partnerId,
      include: {
        program: true,
        partner: true,
        links: true,
      },
    });

    const { groupId } = programEnrollment;

    const allPartnerLinks =
      ProgramPartnerLinkSchema.array().parse(existingPartnerLinks);

    // Step 1: Create partner default links
    await context.run("create-default-links", async () => {
      if (!groupId) {
        console.error(
          `The partner ${partnerId} is not associated with any group.`,
        );
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
        console.error(`Group ${groupId} does not have any default links.`);
        return;
      }

      // Skip existing default links (should never happen since it's a new partner, but just in case)
      for (const link of existingPartnerLinks) {
        if (link.partnerGroupDefaultLinkId) {
          partnerGroupDefaultLinks = partnerGroupDefaultLinks.filter(
            (defaultLink) => defaultLink.id !== link.partnerGroupDefaultLinkId,
          );
        }
      }

      if (partnerGroupDefaultLinks.length === 0) {
        console.error(
          `Already created default links for partner ${partnerId}.`,
        );
        return;
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

      console.info({
        message: `Created ${partnerLinks.length} partner default links.`,
        data: partnerLinks.map(({ id, url, shortLink }) => ({
          id,
          url,
          shortLink,
        })),
      });

      allPartnerLinks.push(...partnerLinks);

      return;
    });

    // for network program, only need to create default links
    if (program.id === NETWORK_PROGRAM_ID) {
      return;
    }

    // Step 2: Auto-provision discount code if enabled
    await context.run("create-discount-codes", async () => {
      await generateDiscountCodeForPartner({
        workspaceId: program.workspaceId,
        partner: {
          id: partner.id,
          name: partner.name,
          groupId,
        },
      });
    });

    // Step 3: Send email to partner application approved
    await context.run("send-email", async () => {
      if (!groupId) {
        console.error(
          `The partner ${partnerId} is not associated with any group.`,
        );
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
        console.log(
          `No partner users found for partner ${partnerId} to send email notification.`,
        );
        return;
      }

      const rewardsAndBounties = await getGroupRewardsAndBounties({
        programId,
        groupId: programEnrollment.groupId || program.defaultGroupId,
      });

      // Resend batch email
      const { data, error } = await sendBatchEmail(
        partnerUsers.map(({ user }) => ({
          variant: "notifications",
          to: user.email!,
          subject: `Your application to ${program.name} has been approved!`,
          replyTo: program.supportEmail || "noreply",
          react: PartnerApplicationApproved({
            program: {
              name: program.name,
              logo: program.logo,
              slug: program.slug,
            },
            partner: {
              name: partner.name,
              email: user.email!,
              payoutsEnabled: Boolean(partner.payoutsEnabledAt),
            },
            ...rewardsAndBounties,
          }),
        })),
        {
          idempotencyKey: `application-approved/${programEnrollment.id}`,
        },
      );

      if (data) {
        console.info({
          message: `Sent emails to ${partnerUsers.length} partner users.`,
          data: data,
        });
      }

      if (error) {
        throw new Error(error.message);
      }
    });

    // Step 4: Send webhook to workspace
    await context.run("send-webhook", async () => {
      const partnerPlatforms = await prisma.partnerPlatform.findMany({
        where: {
          partnerId,
        },
      });

      const enrolledPartner = EnrolledPartnerSchema.parse({
        ...programEnrollment,
        ...partner,
        ...polyfillSocialMediaFields(partnerPlatforms),
        id: partner.id,
        links: allPartnerLinks,
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
    });

    // Step 5: Trigger draft bounty submission creation
    await context.run("trigger-draft-bounty-submission-creation", async () => {
      await triggerDraftBountySubmissionCreation({
        programId,
        partnerIds: [partnerId],
      });
    });

    // Step 6: Execute Dub workflows using the “partnerEnrolled” trigger.
    await context.run("execute-workflows", async () => {
      await executeWorkflows({
        trigger: "partnerEnrolled",
        identity: {
          workspaceId: program.workspaceId,
          programId,
          partnerId,
        },
      });
    });

    // Step 7: Create referral commission if enabled
    await context.run("create-referral-commission", async () => {
      await createReferralCommission({
        partnerId,
        programId,
      });
    });
  },
  {
    initialPayloadParser: (requestPayload) => {
      return inputSchema.parse(JSON.parse(requestPayload));
    },
    failureFunction: async ({
      context,
      failStatus,
      failResponse,
      failHeaders,
    }) => {
      const { correlation } = getWorkflowConfig({
        workflowType: "partner-approved",
        body: context.requestPayload,
      });

      logger.error("workflow.failed", {
        service: "qstash",
        event: "workflow.failed",
        workflowType: "partner-approved",
        workflowRunId: context.workflowRunId,
        failStatus,
        failResponse,
        failHeaders,
        correlation,
      });

      await logger.flush();
    },
  },
);
