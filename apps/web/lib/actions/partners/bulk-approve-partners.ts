"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getBountiesByGroup } from "@/lib/api/bounties/get-bounties-by-group";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { bulkCreateLinks } from "@/lib/api/links";
import { generatePartnerLink } from "@/lib/api/partners/create-partner-link";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  bulkApprovePartnersSchema,
  EnrolledPartnerSchema,
} from "@/lib/zod/schemas/partners";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import PartnerApplicationApproved from "@dub/email/templates/partner-application-approved";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, chunk, isFulfilled } from "@dub/utils";
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
    const allEmails = updatedEnrollments.flatMap(
      ({ partner, clickReward, leadReward, saleReward }) => {
        const partnerEmailsToNotify = partner.users
          .map(({ user }) => user.email)
          .filter(Boolean) as string[];

        return partnerEmailsToNotify.map((email) => ({
          subject: `Your application to join ${program.name} partner program has been approved!`,
          from: VARIANT_TO_FROM_MAP.notifications,
          to: email,
          react: PartnerApplicationApproved({
            program: {
              name: program.name,
              logo: program.logo,
              slug: program.slug,
              supportEmail: program.supportEmail,
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
        const partnerLinks = await bulkCreateLinks({
          links: (
            await Promise.allSettled(
              updatedEnrollments.map(({ partner }) =>
                generatePartnerLink({
                  workspace,
                  program,
                  partner: {
                    name: partner.name,
                    email: partner.email!,
                  },
                  userId: user.id,
                  partnerId: partner.id,
                }),
              ),
            )
          )
            .filter(isFulfilled)
            .map(({ value }) => value),
        });

        // Send bounty notifications
        const bountiesByGroupId = await getBountiesByGroup({
          programId: program.id,
          groupIds: updatedEnrollments
            .map(({ groupId }) => groupId)
            .filter((id): id is string => id !== null),
        });

        const partnersByGroupId = updatedEnrollments.reduce(
          (acc, { partner, groupId }) => {
            if (groupId) {
              acc[groupId] = [...(acc[groupId] || []), partner];
            }

            return acc;
          },
          {} as Record<
            string,
            (typeof updatedEnrollments)[number]["partner"][]
          >,
        );

        const bountyNotificationPromises: Promise<any>[] = [];

        for (const [groupId, partners] of Object.entries(partnersByGroupId)) {
          const bounties = bountiesByGroupId[groupId] || [];

          if (bounties.length === 0) {
            continue;
          }

          for (const bounty of bounties) {
            bountyNotificationPromises.push(
              qstash.publishJSON({
                url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/notify-partners`,
                body: {
                  bountyId: bounty.id,
                  partnerIds: partners.map((p) => p.id),
                },
                notBefore:
                  Math.floor(new Date().getTime() / 1000) + 1 * 60 * 60, // 1 hour from now
              }),
            );
          }
        }

        await Promise.allSettled([
          // Send bounty notifications
          ...bountyNotificationPromises,

          // Send approval emails
          ...emailChunks.map((emailChunk) => resend.batch.send(emailChunk)),

          // Send enrolled webhooks
          ...updatedEnrollments.map(({ partner, ...enrollment }) =>
            sendWorkspaceWebhook({
              workspace,
              trigger: "partner.enrolled",
              data: EnrolledPartnerSchema.parse({
                ...partner,
                ...enrollment,
                id: partner.id,
                links: partnerLinks.filter(
                  ({ partnerId }) => partnerId === partner.id,
                ),
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
        ]);
      })(),
    );
  });
