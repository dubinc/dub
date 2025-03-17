"use server";

import { sendEmail } from "@dub/email";
import { PartnerInvite } from "@dub/email/templates/partner-invite";
import { prisma } from "@dub/prisma";
import z from "../../zod";
import { authActionClient } from "../safe-action";

const resendProgramInviteSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string(),
});

export const resendProgramInviteAction = authActionClient
  .schema(resendProgramInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { programId, partnerId } = parsedInput;
    const { workspace } = ctx;

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

    if (program.workspaceId !== workspace.id) {
      throw new Error("Program not found.");
    }

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

    await Promise.all([
      sendEmail({
        subject: `${program.name} invited you to join Dub Partners`,
        email: partner.email!,
        react: PartnerInvite({
          email: partner.email!,
          appName: `${process.env.NEXT_PUBLIC_APP_NAME}`,
          program: {
            name: program.name,
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
    ]);
  });
