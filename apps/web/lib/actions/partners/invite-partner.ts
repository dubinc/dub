"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { createPartnerLink } from "@/lib/api/partners/create-partner-link";
import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { invitePartnerSchema } from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import PartnerInvite from "@dub/email/templates/partner-invite";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { getLinkOrThrow } from "../../api/links/get-link-or-throw";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";

export const invitePartnerAction = authActionClient
  .schema(invitePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { name, email, linkId, rewardId, discountId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    let [program, link, reward] = await Promise.all([
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

      rewardId
        ? getRewardOrThrow({
            programId,
            rewardId,
          })
        : null,
    ]);

    if (link?.partnerId) {
      throw new Error("Link is already associated with another partner.");
    }

    const programEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        programId: program.id,
        partner: {
          email,
        },
      },
    });

    if (programEnrollment) {
      const statusMessages = {
        invited: "has already been invited to",
        approved: "is already enrolled in",
        rejected: "was rejected from",
        declined: "declined the invite to",
        pending: "has a pending application to join",
      };

      const message = statusMessages[programEnrollment.status];

      if (message) {
        throw new Error(`Partner ${email} ${message} this program.`);
      }
    }

    // If the link is not provided, create a new one
    if (!link) {
      link = await createPartnerLink({
        workspace,
        program,
        partner: {
          name,
          email,
        },
        userId: user.id,
      });
    }

    const enrolledPartner = await createAndEnrollPartner({
      program,
      link,
      workspace,
      partner: {
        name,
        email,
      },
      skipEnrollmentCheck: true,
      status: "invited",
      ...(reward && { reward }),
      ...(discountId && { discountId }),
    });

    waitUntil(
      (async () => {
        await Promise.allSettled([
          sendEmail({
            subject: `${program.name} invited you to join Dub Partners`,
            email,
            react: PartnerInvite({
              email,
              program: {
                name: program.name,
                slug: program.slug,
                logo: program.logo,
              },
            }),
          }),

          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "partner.invited",
            description: `Partner ${enrolledPartner.id} invited`,
            actor: user,
            targets: [
              {
                type: "partner",
                id: enrolledPartner.id,
                metadata: enrolledPartner,
              },
            ],
          }),
        ]);
      })(),
    );
  });
