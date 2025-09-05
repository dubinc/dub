import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import PartnerApplicationApproved from "@dub/email/templates/partner-application-approved";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { recordAuditLog } from "../api/audit-logs/record-audit-log";
import { getGroupOrThrow } from "../api/groups/get-group-or-throw";
import { createPartnerDefaultLinks } from "../api/partners/create-partner-default-links";
import { RewardProps, WorkspaceProps } from "../types";
import { sendWorkspaceWebhook } from "../webhook/publish";
import { EnrolledPartnerSchema } from "../zod/schemas/partners";

export async function approvePartnerEnrollment({
  programId,
  partnerId,
  userId,
  groupId,
}: {
  programId: string;
  partnerId: string;
  userId: string;
  groupId?: string | null;
}) {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      rewards: true,
      discounts: true,
      workspace: true,
    },
  });

  if (!groupId && !program.defaultGroupId) {
    throw new Error("No group ID provided and no default group ID found.");
  }

  const group = await getGroupOrThrow({
    programId,
    groupId: groupId || program.defaultGroupId,
    includeExpandedFields: true,
  });

  const programEnrollment = await prisma.programEnrollment.update({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    data: {
      status: "approved",
      createdAt: new Date(),
      groupId: group.id,
      clickRewardId: group.clickRewardId,
      leadRewardId: group.leadRewardId,
      saleRewardId: group.saleRewardId,
      discountId: group.discountId,
    },
    include: {
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

  const { partner, ...enrollment } = programEnrollment;
  const workspace = program.workspace as WorkspaceProps;

  const partnerLinks = await createPartnerDefaultLinks({
    workspace: {
      id: workspace.id,
      plan: workspace.plan,
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
      defaultLinks: group.partnerGroupDefaultLinks,
      utmTemplate: group.utmTemplate,
    },
    userId,
  });

  waitUntil(
    (async () => {
      const partnerEmailsToNotify = partner.users
        .map(({ user }) => user.email)
        .filter(Boolean) as string[];

      const user = await prisma.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      const enrolledPartner = EnrolledPartnerSchema.parse({
        ...partner,
        ...enrollment,
        id: partner.id,
        links: partnerLinks,
      });

      const rewards = [
        group.clickReward,
        group.leadReward,
        group.saleReward,
      ].filter(Boolean) as RewardProps[];

      await Promise.allSettled([
        ...(partnerEmailsToNotify.length
          ? [
              resend.batch.send(
                partnerEmailsToNotify.map((email) => ({
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
                      reward: rewards.find((r) => r.event === "sale"),
                      showModifiersTooltip: false,
                    }),
                  }),
                })),
              ),
            ]
          : []),

        sendWorkspaceWebhook({
          workspace,
          trigger: "partner.enrolled",
          data: enrolledPartner,
        }),

        recordAuditLog({
          workspaceId: workspace.id,
          programId,
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
        }),
      ]);
    })(),
  );
}
