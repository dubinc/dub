"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { partnerTagDeletedJob } from "@/lib/jobs/handlers/partner-tag-deleted-job";
import { prisma } from "@/lib/prisma";
import { deletePartnerTagSchema } from "@/lib/zod/schemas/partner-tags";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../../safe-action";
import { throwIfNoPermission } from "../../throw-if-no-permission";

// Delete a partner tag
export const deletePartnerTagAction = authActionClient
  .inputSchema(deletePartnerTagSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerTagId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { count } = await prisma.partnerTag.updateMany({
      where: {
        id: partnerTagId,
        programId,
      },
      data: {
        programId: null,
      },
    });

    if (count === 0) {
      throw new Error("Partner tag not found or already deleted.");
    }

    waitUntil(
      partnerTagDeletedJob.dispatch(
        {
          partnerTagId,
        },
        {
          label: partnerTagId,
        },
      ),
    );
  });
