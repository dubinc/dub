"use server";

import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getRewardOrThrow } from "@/lib/api/partners/get-reward-or-throw";
import { invitePartnerSchema } from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import { PartnerInvite } from "@dub/email/templates/partner-invite";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { getLinkOrThrow } from "../../api/links/get-link-or-throw";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";

export const invitePartnerAction = authActionClient
  .schema(invitePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, name, email, linkId, rewardId, discountId } =
      parsedInput;

    const [program, link, , ,] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),

      getLinkOrThrow({
        workspaceId: workspace.id,
        linkId,
      }),

      rewardId
        ? getRewardOrThrow({
            programId,
            rewardId,
          })
        : null,

      discountId
        ? getDiscountOrThrow({
            programId,
            discountId,
          })
        : null,
    ]);

    if (link.partnerId) {
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

    await createAndEnrollPartner({
      program,
      link,
      workspace,
      partner: {
        name,
        email,
      },
      skipEnrollmentCheck: true,
      status: "invited",
      ...(rewardId && { rewardId }),
      ...(discountId && { discountId }),
    });

    waitUntil(
      sendEmail({
        subject: `${program.name} invited you to join Dub Partners`,
        email,
        react: PartnerInvite({
          email,
          appName: `${process.env.NEXT_PUBLIC_APP_NAME}`,
          program: {
            name: program.name,
            logo: program.logo,
          },
        }),
      }),
    );
  });
