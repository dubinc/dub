import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import PartnerApplicationApproved from "@dub/email/templates/partner-application-approved";
import { prisma } from "@dub/prisma";
import { chunk, isFulfilled } from "@dub/utils";
import { Partner, ProgramEnrollment } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { recordAuditLog } from "../api/audit-logs/record-audit-log";
import { getGroupOrThrow } from "../api/groups/get-group-or-throw";
import { bulkCreateLinks } from "../api/links";
import { generatePartnerLink } from "../api/partners/create-partner-link";
import { Session } from "../auth/utils";
import { ProgramWithLanderDataProps, WorkspaceProps } from "../types";
import { sendWorkspaceWebhook } from "../webhook/publish";
import { EnrolledPartnerSchema } from "../zod/schemas/partners";

export async function bulkApprovePartners({
  workspace,
  program,
  programEnrollments,
  user,
  groupId,
}: {
  workspace: Pick<WorkspaceProps, "id" | "plan" | "webhookEnabled">;
  program: ProgramWithLanderDataProps;
  programEnrollments: (ProgramEnrollment & {
    partner: Partner & { users: { user: { email: string | null } }[] };
  })[];
  user: Session["user"];
  groupId: string;
}) {
  const group = await getGroupOrThrow({
    programId: program.id,
    groupId,
    includeRewardsAndDiscount: true,
  });

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

  // Create all emails first, then chunk them into batches of 100
  const allEmails = programEnrollments.flatMap(({ partner }) => {
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
          reward: group.saleReward || group.leadReward || group.clickReward,
          showModifiersTooltip: false,
        }),
      }),
    }));
  });

  const emailChunks = chunk(allEmails, 100);

  waitUntil(
    (async () => {
      // Create partner links
      const partnerLinks = await bulkCreateLinks({
        links: (
          await Promise.allSettled(
            programEnrollments.map(({ partner }) =>
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

      await Promise.allSettled([
        // Send approval emails
        ...emailChunks.map((emailChunk) => resend?.batch.send(emailChunk)),

        // Send enrolled webhooks
        ...programEnrollments.map(({ partner, ...enrollment }) =>
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
          programEnrollments.map(({ partner }) => ({
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
}
