"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { rejectProgramApplication } from "@/lib/program-applications/reject-program-application";
import { rejectProgramApplicationSchema } from "@/lib/zod/schemas/program-application";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const inputSchema = rejectProgramApplicationSchema.extend({
  workspaceId: z.string(),
});

// Reject a pending partner application
export const rejectProgramApplicationAction = authActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      partnerId,
      rejectionReason,
      rejectionNote,
      reapplicationTimeframe,
      flagForFraud,
      flagForFraudReason,
    } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    return await rejectProgramApplication({
      programId,
      partnerId,
      rejectionReason,
      rejectionNote,
      reapplicationTimeframe,
      flagForFraud,
      flagForFraudReason,
      userId: user.id,
    });
  });
