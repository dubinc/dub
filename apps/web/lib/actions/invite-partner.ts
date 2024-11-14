"use server";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "emails";
import PartnerInvite from "emails/partner-invite";
import { z } from "zod";
import { getLinkOrThrow } from "../api/links/get-link-or-throw";
import { getProgramOrThrow } from "../api/programs/get-program";
import { updateConfig } from "../edge-config";
import { authActionClient } from "./safe-action";

const invitePartnerSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  email: z.string().trim().email().min(1).max(100),
  linkId: z.string(),
});

export const invitePartnerAction = authActionClient
  .schema(invitePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { email, linkId, programId } = parsedInput;

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    await getLinkOrThrow({
      workspace,
      linkId,
    });

    const programInvite = await prisma.programInvite.findUnique({
      where: {
        email_programId: {
          email,
          programId,
        },
      },
    });

    if (programInvite) {
      throw new Error(`Partner ${email} already invited to this program.`);
    }

    const [linkInProgramEnrollment, linkInProgramInvite] = await Promise.all([
      prisma.programEnrollment.findUnique({
        where: {
          linkId,
        },
      }),

      prisma.programInvite.findUnique({
        where: {
          linkId,
        },
      }),
    ]);

    if (linkInProgramEnrollment || linkInProgramInvite) {
      throw new Error("Link is already associated with another partner.");
    }

    const result = await prisma.programInvite.create({
      data: {
        email,
        linkId,
        programId,
      },
    });

    await updateConfig({
      key: "partnersPortal",
      value: email,
    });

    await sendEmail({
      subject: `${program.name} invited you to join Dub Partners`,
      email,
      react: PartnerInvite({
        email,
        appName: `${process.env.NEXT_PUBLIC_APP_NAME}`,
        programName: program.name,
        programLogo: program.logo,
      }),
    });

    return result;
  });
