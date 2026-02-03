"use server";

import { bulkDeactivatePartners } from "@/lib/api/partners/bulk-deactivate-partners";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { bulkDeactivatePartnersSchema } from "@/lib/zod/schemas/partners";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const bulkDeactivatePartnersAction = authActionClient
  .inputSchema(bulkDeactivatePartnersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    await bulkDeactivatePartners({
      workspaceId: workspace.id,
      programId,
      partnerIds,
      user,
    });
  });
