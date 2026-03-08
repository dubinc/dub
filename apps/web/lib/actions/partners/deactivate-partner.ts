"use server";

import { deactivatePartner } from "@/lib/api/partners/deactivate-partner";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { deactivatePartnerSchema } from "@/lib/zod/schemas/partners";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Deactivate a partner
export const deactivatePartnerAction = authActionClient
  .inputSchema(deactivatePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    await deactivatePartner({
      workspaceId: workspace.id,
      programId,
      partnerId,
      user,
    });
  });
