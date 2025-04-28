"use server";

import { createPartnerLink } from "@/lib/api/partners/create-partner-link";
import { determinePartnerDiscount } from "@/lib/partners/determine-partner-discount";
import { determinePartnerRewards } from "@/lib/partners/determine-partner-rewards";
import { ProgramPartnerLinkProps } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  approvePartnerSchema,
  EnrolledPartnerSchema,
} from "@/lib/zod/schemas/partners";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { sendEmail } from "@dub/email";
import { PartnerApplicationApproved } from "@dub/email/templates/partner-application-approved";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { getLinkOrThrow } from "../../api/links/get-link-or-throw";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { recordLink } from "../../tinybird";
import { authActionClient } from "../safe-action";

// Approve a partner application
export const approvePartnerAction = authActionClient
  .schema(approvePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { programId, partnerId, linkId } = parsedInput;

    const [program, link] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),

      linkId
        ? getLinkOrThrow({
            workspaceId: workspace.id,
            linkId,
          })
        : null,
    ]);

    if (link?.partnerId) {
      throw new Error("Link is already associated with another partner.");
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
        : null,
    ]);

    let partnerLink: ProgramPartnerLinkProps;

    if (updatedLink) {
      partnerLink = updatedLink;
    } else {
      const { partner } = programEnrollment;

      partnerLink = await createPartnerLink({
        workspace,
        program,
        partner: {
          name: partner.name,
          email: partner.email!,
        },
        userId: user.id,
        partnerId,
      });
    }

    waitUntil(
      (async () => {
        const { partner, ...enrollment } = programEnrollment;

        const [rewards, discount] = await Promise.all([
          determinePartnerRewards({
            programId,
            partnerId,
          }),

          determinePartnerDiscount({
            programId,
            partnerId,
          }),
        ]);

        const enrolledPartner = EnrolledPartnerSchema.parse({
          ...partner,
          ...enrollment,
          id: partner.id,
          links: [partnerLink],
          rewards,
          discount,
        });

        await Promise.all([
          updatedLink ? recordLink(updatedLink) : null,

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
                reward: rewards?.[0],
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
  });
