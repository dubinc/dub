import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { sendEmail } from "@dub/email";
import PartnerApplicationApproved from "@dub/email/templates/partner-application-approved";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { recordAuditLog } from "../api/audit-logs/record-audit-log";
import { getLinkOrThrow } from "../api/links/get-link-or-throw";
import { createPartnerLink } from "../api/partners/create-partner-link";
import { getDefaultProgramIdOrThrow } from "../api/programs/get-default-program-id-or-throw";
import { recordLink } from "../tinybird/record-link";
import { ProgramPartnerLinkProps, WorkspaceProps } from "../types";
import { sendWorkspaceWebhook } from "../webhook/publish";
import { EnrolledPartnerSchema } from "../zod/schemas/partners";
import { REWARD_EVENT_COLUMN_MAPPING } from "../zod/schemas/rewards";
import { getProgramApplicationRewardsAndDiscount } from "./get-program-application-rewards";

export async function approvePartnerEnrollment({
  workspace,
  partnerId,
  linkId,
  userId,
}: {
  workspace: Pick<
    WorkspaceProps,
    "id" | "plan" | "webhookEnabled" | "defaultProgramId"
  >;
  partnerId: string;
  linkId: string | null;
  userId: string;
}) {
  const { id: workspaceId } = workspace;
  const programId = getDefaultProgramIdOrThrow(workspace);

  const [program, link] = await Promise.all([
    prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      include: {
        rewards: true,
        discounts: true,
      },
    }),
    linkId
      ? getLinkOrThrow({
          workspaceId,
          linkId,
        })
      : Promise.resolve(null),
  ]);

  const { rewards, discount } =
    getProgramApplicationRewardsAndDiscount(program);

  if (link?.partnerId) {
    throw new Error("This link is already associated with another partner.");
  }

  const [programEnrollment, updatedLink] = await Promise.all([
    prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      data: {
        status: "approved",
        createdAt: new Date(),
        ...(rewards.length > 0 && {
          ...Object.fromEntries(
            rewards.map((r) => [REWARD_EVENT_COLUMN_MAPPING[r.event], r.id]),
          ),
        }),
        ...(discount && {
          discountId: discount.id,
        }),
      },
      include: {
        partner: true,
      },
    }),

    // Update link to have programId and partnerId
    link
      ? prisma.link.update({
          where: {
            id: link.id,
          },
          data: {
            programId,
            partnerId,
            folderId: program.defaultFolderId,
          },
          include: {
            tags: {
              select: {
                tag: true,
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  let partnerLink: ProgramPartnerLinkProps;
  const { partner, ...enrollment } = programEnrollment;

  if (updatedLink) {
    partnerLink = updatedLink;
  } else {
    partnerLink = await createPartnerLink({
      workspace,
      program,
      partner: {
        name: partner.name,
        email: partner.email!,
      },
      userId,
      partnerId,
    });
  }

  waitUntil(
    (async () => {
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
        links: [partnerLink],
      });

      await Promise.allSettled([
        updatedLink ? recordLink(updatedLink) : Promise.resolve(null),

        sendEmail({
          subject: `Your application to join ${program.name} partner program has been approved!`,
          email: partner.email!,
          react: PartnerApplicationApproved({
            program: {
              name: program.name,
              logo: program.logo,
              slug: program.slug,
              supportEmail: program.supportEmail,
            },
            partner: {
              name: partner.name,
              email: partner.email!,
              payoutsEnabled: Boolean(partner.payoutsEnabledAt),
            },
            rewardDescription: ProgramRewardDescription({
              reward: rewards.find((r) => r.event === "sale"),
            }),
          }),
        }),

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
