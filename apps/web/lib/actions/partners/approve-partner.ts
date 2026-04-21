"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { approvePartner } from "@/lib/partners/approve-partner";
import { approvePartnerSchema } from "@/lib/zod/schemas/partners";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const inputSchema = approvePartnerSchema.extend({
  workspaceId: z.string(),
});

// Approve a partner application
export const approvePartnerAction = authActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, groupId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    await approvePartner({
      programId,
      partnerId,
      userId: user.id,
      groupId,
    });
  });
