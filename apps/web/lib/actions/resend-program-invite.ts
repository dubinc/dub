"use server";

import { PartnerInvite } from "@dub/email/templates/partner-invite";
import { prisma } from "@dub/prisma";
import { sendEmail } from "@dub/email";
import z from "../zod";
import { authActionClient } from "./safe-action";

export const resendProgramInviteAction = authActionClient
  .schema(
    z.object({
      workspaceId: z.string(),
      programInviteId: z.string(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { programInviteId } = parsedInput;
    const { workspace } = ctx;

    const programInvite = await prisma.programInvite.findUnique({
      where: {
        id: programInviteId,
      },
      include: {
        program: true,
      },
    });

    if (!programInvite || programInvite.program.workspaceId !== workspace.id) {
      throw new Error("Program invite not found");
    }

    // cannot resend invite within 24 hours
    if (programInvite.createdAt.getTime() + 24 * 60 * 60 * 1000 > Date.now()) {
      throw new Error(
        "Cannot resend invite within 24 hours. Please try again later.",
      );
    }

    const { program, email } = programInvite;

    await Promise.all([
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
      prisma.programInvite.update({
        where: { id: programInviteId },
        data: { createdAt: new Date() },
      }),
    ]);

    return {
      success: true,
    };
  });
