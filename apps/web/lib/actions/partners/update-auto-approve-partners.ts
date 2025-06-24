"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { bulkApprovePartners } from "@/lib/partners/bulk-approve-partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  autoApprovePartners: z.boolean(),
});

export const updateAutoApprovePartnersAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { autoApprovePartners } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);
    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        autoApprovePartners,
      },
    });

    if (!autoApprovePartners) return;

    // Approve all pending applications if auto-approve is now enabled
    waitUntil(
      (async () => {
        const programEnrollments = await prisma.programEnrollment.findMany({
          where: {
            programId: programId,
            status: "pending",
          },
          include: {
            partner: true,
          },
        });

        await bulkApprovePartners({
          workspace,
          program,
          programEnrollments,
          userId: user.id,
        });
      })(),
    );
  });
