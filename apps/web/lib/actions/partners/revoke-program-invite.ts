"use server";

import { linkCache } from "@/lib/api/links/cache";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import z from "../../zod";
import { authActionClient } from "../safe-action";

const revokeProgramInviteSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
});

export const revokeProgramInviteAction = authActionClient
  .schema(revokeProgramInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partnerId } = parsedInput;
    const { workspace } = ctx;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { links: partnerLinks, ...programEnrollment } =
      await prisma.programEnrollment.findUniqueOrThrow({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        include: {
          links: true,
        },
      });

    if (programEnrollment.status !== "invited") {
      throw new Error("Program invite not found.");
    }

    // if some of the partner's links already have recorded leads, we can't revoke the invite
    if (partnerLinks.some((link) => link.leads > 0)) {
      throw new Error(
        "This partner already has a few recorded leads, so the invite is no longer reversible. Contact support if you need to revoke the invite.",
      );
    }

    const res = await prisma.$transaction(async (tx) => {
      // delete partner's links
      const deletedLinks = await tx.link.deleteMany({
        where: {
          id: { in: partnerLinks.map((link) => link.id) },
        },
      });

      // delete program enrollment
      const deletedProgramEnrollment = await tx.programEnrollment.delete({
        where: { id: programEnrollment.id },
      });

      return {
        deletedLinks,
        deletedProgramEnrollment,
      };
    });

    console.log("Deleted program enrollment", res);

    waitUntil(
      Promise.all([
        // Expire the links from Redis
        linkCache.expireMany(partnerLinks),

        // Record the links deletion in Tinybird
        recordLink(partnerLinks, { deleted: true }),

        // Update totalLinks for the workspace
        prisma.project.update({
          where: { id: workspace.id },
          data: {
            totalLinks: { decrement: partnerLinks.length },
          },
        }),
      ]),
    );

    return res;
  });
