"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { triggerDraftBountySubmissionCreation } from "@/lib/api/bounties/trigger-draft-bounty-submissions";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { createPartnerDefaultLinks } from "@/lib/api/partners/create-partner-default-links";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { PlanProps } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  bulkApprovePartnersSchema,
  EnrolledPartnerSchema,
} from "@/lib/zod/schemas/partners";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { sendBatchEmail } from "@dub/email";
import { ResendBulkEmailOptions } from "@dub/email/resend/types";
import PartnerApplicationApproved from "@dub/email/templates/partner-application-approved";
import { prisma } from "@dub/prisma";
import { chunk, isFulfilled } from "@dub/utils";
import { Link } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Approve partners applications in bulk
export const bulkApprovePartnersAction = authActionClient
  .schema(bulkApprovePartnersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds, groupId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partners: programEnrollments, ...program } =
      await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        include: {
          partners: {
            where: {
              status: "pending",
              partnerId: {
                in: partnerIds,
              },
            },
          },
        },
      });

    // Fetch the group if it provided
    const group = groupId
      ? await getGroupOrThrow({
          programId: program.id,
          groupId,
        })
      : null;

    // Approve the enrollments and update the group if it provided
    await prisma.programEnrollment.updateMany({
      where: {
        id: {
          in: programEnrollments.map(({ id }) => id),
        },
      },
      data: {
        status: "approved",
        createdAt: new Date(),
        ...(group && {
          groupId: group.id,
          clickRewardId: group.clickRewardId,
          leadRewardId: group.leadRewardId,
          saleRewardId: group.saleRewardId,
          discountId: group.discountId,
        }),
      },
    });

    // fetch the updated enrollments with the partner and users
    const updatedEnrollments = await prisma.programEnrollment.findMany({
      where: {
        id: {
          in: programEnrollments.map(({ id }) => id),
        },
      },
      include: {
        clickReward: true,
        leadReward: true,
        saleReward: true,
        partnerGroup: {
          include: {
            partnerGroupDefaultLinks: true,
            utmTemplate: true,
          },
        },
        partner: {
          include: {
            users: {
              where: {
                notificationPreferences: {
                  applicationApproved: true,
                },
              },
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    // Create all emails first, then chunk them into batches of 100
    const allEmails: ResendBulkEmailOptions = updatedEnrollments.flatMap(
      ({ partner, clickReward, leadReward, saleReward }) => {
        const partnerEmailsToNotify = partner.users
          .map(({ user }) => user.email)
          .filter(Boolean) as string[];

        return partnerEmailsToNotify.map((email) => ({
          subject: `Your application to join ${program.name} partner program has been approved!`,
          variant: "notifications",
          to: email,
          react: PartnerApplicationApproved({
            program: {
              name: program.name,
              logo: program.logo,
              slug: program.slug,
            },
            partner: {
              name: partner.name,
              email,
              payoutsEnabled: Boolean(partner.payoutsEnabledAt),
            },
            rewardDescription: ProgramRewardDescription({
              reward: saleReward ?? leadReward ?? clickReward,
              showModifiersTooltip: false,
            }),
          }),
        }));
      },
    );

    const emailChunks = chunk(allEmails, 100);

    waitUntil(
      (async () => {
        // Create partner links
        const partnerLinksPromises = await Promise.allSettled(
          updatedEnrollments.map(({ partner, tenantId, partnerGroup }) =>
            createPartnerDefaultLinks({
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
                tenantId: tenantId ?? undefined,
              },
              group: {
                defaultLinks: partnerGroup?.partnerGroupDefaultLinks ?? [],
                utmTemplate: partnerGroup?.utmTemplate ?? null,
              },
              userId: user.id,
            }),
          ),
        );

        // A partner can have multiple links, so we need to filter them by partnerId
        const partnerLinks = partnerLinksPromises
          .filter(isFulfilled)
          .map(({ value }) => value)
          .flat();

        // A map of partnerId to links
        const partnerLinksMap = partnerLinks.reduce((acc, link) => {
          if (!link.partnerId) return acc;

          if (!acc.has(link.partnerId)) {
            acc.set(link.partnerId, []);
          }

          acc.get(link.partnerId)!.push(link);

          return acc;
        }, new Map<string, Omit<Link, "partnerGroupDefaultLinkId">[]>());

        const partnerIds = updatedEnrollments.map(({ partner }) => partner.id);

        await Promise.allSettled([
          // Send approval emails
          ...emailChunks.map((emailChunk) => sendBatchEmail(emailChunk)),

          // Send enrolled webhooks
          ...updatedEnrollments.map(({ partner, ...enrollment }) =>
            sendWorkspaceWebhook({
              workspace,
              trigger: "partner.enrolled",
              data: EnrolledPartnerSchema.parse({
                ...partner,
                ...enrollment,
                id: partner.id,
                links: partnerLinksMap.get(partner.id) ?? [],
              }),
            }),
          ),

          recordAuditLog(
            updatedEnrollments.map(({ partner }) => ({
              workspaceId: workspace.id,
              programId: program.id,
              action: "partner_application.approved",
              description: `Partner application approved for ${partner.id}`,
              actor: user,
              targets: [
                {
                  type: "partner",
                  id: partner.id,
                  metadata: partner,
                },
              ],
            })),
          ),

          triggerDraftBountySubmissionCreation({
            programId,
            partnerIds,
          }),
        ]);
      })(),
    );
  });
