import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { sendEmail } from "@dub/email";
import PartnerApplicationApproved from "@dub/email/templates/partner-application-approved";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { getLinkOrThrow } from "../api/links/get-link-or-throw";
import { createPartnerLink } from "../api/partners/create-partner-link";
import { recordLink } from "../tinybird/record-link";
import {
  ProgramPartnerLinkProps,
  ProgramProps,
  WorkspaceProps,
} from "../types";
import { sendWorkspaceWebhook } from "../webhook/publish";
import { EnrolledPartnerSchema } from "../zod/schemas/partners";
import { REWARD_EVENT_COLUMN_MAPPING } from "../zod/schemas/rewards";

export async function approvePartnerEnrollment({
  workspace,
  program,
  partnerId,
  linkId,
  userId,
}: {
  workspace: Pick<WorkspaceProps, "id" | "plan" | "webhookEnabled">;
  program: ProgramProps;
  partnerId: string;
  linkId: string | null;
  userId: string;
}) {
  const { id: workspaceId } = workspace;
  const { id: programId } = program;

  const [link, defaultRewards] = await Promise.all([
    linkId
      ? getLinkOrThrow({
          workspaceId,
          linkId,
        })
      : Promise.resolve(null),

    prisma.reward.findMany({
      where: {
        programId,
        default: true,
      },
    }),
  ]);

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
        ...(defaultRewards.length > 0 && {
          ...Object.fromEntries(
            defaultRewards.map((r) => [
              REWARD_EVENT_COLUMN_MAPPING[r.event],
              r.id,
            ]),
          ),
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
              reward: defaultRewards.find((r) => r.event === "sale"),
            }),
          }),
        }),

        sendWorkspaceWebhook({
          workspace,
          trigger: "partner.enrolled",
          data: enrolledPartner,
        }),
      ]);
    })(),
  );
}
