"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { markPartnerTagDeleted } from "@/lib/api/tags/mark-partner-tag-deleted";
import { deletePartnerTagSchema } from "@/lib/zod/schemas/partner-tags";
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

    const deleted = await markPartnerTagDeleted({
      partnerTagId,
      programId,
    });

    if (!deleted) {
      throw new Error("Partner tag not found.");
    }
  });
