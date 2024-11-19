"use server";

import { prisma } from "@/lib/prisma";
import { getLinkOrThrow } from "../api/links/get-link-or-throw";
import { getProgramOrThrow } from "../api/programs/get-program";
import z from "../zod";
import { authActionClient } from "./safe-action";

const approvePartnerSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string(),
  linkId: z.string(),
});

// Update a partner enrollment
export const approvePartner = authActionClient
  .schema(approvePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, partnerId, linkId } = parsedInput;

    try {
      await getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      });

      const [link, programEnrollment] = await Promise.all([
        getLinkOrThrow({
          workspaceId: workspace.id,
          linkId,
        }),
        prisma.programEnrollment.findUnique({
          where: {
            partnerId_programId: {
              partnerId,
              programId,
            },
          },
        }),
      ]);

      if (!programEnrollment) throw new Error("Program enrollment not found");

      if (programEnrollment.status !== "pending")
        throw new Error("Program enrollment is not pending");

      if (link.programId) {
        throw new Error("Link is already associated with another partner.");
      }

      await prisma.programEnrollment.update({
        where: {
          id: programEnrollment.id,
        },
        data: {
          status: "approved",
          linkId: link.id,
        },
      });

      // TODO: [partners] Notify partner of approval?
    } catch (e) {
      return { ok: false, error: e.message };
    }

    return { ok: true };
  });
