"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { updatePartnerCommission } from "@/lib/api/commissions/update-partner-commission";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const markCommissionDuplicateSchema = z.object({
  workspaceId: z.string(),
  commissionId: z.string(),
});

// Mark a commission as duplicate
export const markCommissionDuplicateAction = authActionClient
  .inputSchema(markCommissionDuplicateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { commissionId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const commission = await updatePartnerCommission({
      programId,
      commissionId,
      userId: user.id,
      status: "duplicate",
      currency: "usd",
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "commission.marked_duplicate",
        description: `Commission ${commissionId} marked as duplicate`,
        actor: user,
        targets: [
          {
            type: "commission",
            id: commissionId,
            metadata: commission,
          },
        ],
      }),
    );
  });
