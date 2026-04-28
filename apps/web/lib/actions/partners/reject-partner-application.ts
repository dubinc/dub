"use server";

import { rejectPartner } from "@/lib/api/partners/applications/reject-partner";
import { rejectPartnerSchema } from "@/lib/zod/schemas/partners";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const inputSchema = rejectPartnerSchema.extend({
  workspaceId: z.string(),
});

// Reject a pending partner application
export const rejectPartnerApplicationAction = authActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, rejectionReason, rejectionNote, allowImmediateReapply } =
      parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    await rejectPartner({
      workspace,
      partnerId,
      rejectionReason,
      rejectionNote,
      allowImmediateReapply,
      userId: user.id,
    });
  });
