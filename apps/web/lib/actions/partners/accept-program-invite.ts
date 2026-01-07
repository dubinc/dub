"use server";

import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { EnrolledPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

const acceptProgramInviteSchema = z.object({
  programId: z.string(),
});

export const acceptProgramInviteAction = authPartnerActionClient
  .inputSchema(acceptProgramInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner } = ctx;
    const { programId } = parsedInput;

    const enrollment = await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId,
        },
        status: "invited",
      },
      data: {
        status: "approved",
        createdAt: new Date(),
      },
      include: {
        links: true,
      },
    });

    waitUntil(
      (async () => {
        const workspace = await prisma.project.findUnique({
          where: {
            defaultProgramId: programId,
          },
        });

        if (!workspace) {
          console.log("No workspace found for program", programId);
          return;
        }

        const enrolledPartner = EnrolledPartnerSchema.parse({
          ...partner,
          ...enrollment,
          id: partner.id,
        });

        await sendWorkspaceWebhook({
          workspace,
          trigger: "partner.enrolled",
          data: enrolledPartner,
        });
      })(),
    );
  });
