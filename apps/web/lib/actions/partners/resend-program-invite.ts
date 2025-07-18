"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { sendEmail } from "@dub/email";
import PartnerInvite from "@dub/email/templates/partner-invite";
import { prisma } from "@dub/prisma";
import z from "../../zod";
import { authActionClient } from "../safe-action";

const resendProgramInviteSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
});

export const resendProgramInviteAction = authActionClient
  .schema(resendProgramInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partnerId } = parsedInput;
    const { workspace, user } = ctx;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { program, partner, ...programEnrollment } =
      await prisma.programEnrollment.findUniqueOrThrow({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        include: {
          program: true,
          partner: true,
        },
      });

    if (programEnrollment.status !== "invited") {
      throw new Error("Invite not found.");
    }

    // cannot resend invite within 24 hours
    if (
      programEnrollment.createdAt.getTime() + 24 * 60 * 60 * 1000 >
      Date.now()
    ) {
      throw new Error(
        "Cannot resend invite within 24 hours. Please try again later.",
      );
    }

    await Promise.allSettled([
      sendEmail({
        subject: `${program.name} invited you to join Dub Partners`,
        email: partner.email!,
        react: PartnerInvite({
          email: partner.email!,
          program: {
            name: program.name,
            slug: program.slug,
            logo: program.logo,
          },
        }),
      }),

      prisma.programEnrollment.update({
        where: {
          id: programEnrollment.id,
        },
        data: {
          createdAt: new Date(),
        },
      }),

      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "partner.invite_resent",
        description: `Partner ${partner.id} invite resent`,
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
  });
