"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { approvePartnerEnrollment } from "@/lib/partners/approve-partner-enrollment";
import { approvePartnerSchema } from "@/lib/zod/schemas/partners";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Approve a partner application
export const approvePartnerAction = authActionClient
  .inputSchema(approvePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, groupId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    await approvePartnerEnrollment({
      programId,
      partnerId,
      userId: user.id,
      groupId,
    });
  });
