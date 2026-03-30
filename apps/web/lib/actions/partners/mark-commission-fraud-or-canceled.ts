"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { updatePartnerCommission } from "@/lib/api/commissions/update-partner-commission";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const markCommissionFraudOrCanceledSchema = z.object({
  workspaceId: z.string(),
  commissionId: z.string(),
  status: z.enum(["fraud", "canceled"]),
});

// Mark a commission as fraud or canceled for a partner + customer for all historical commissions
export const markCommissionFraudOrCanceledAction = authActionClient
  .inputSchema(markCommissionFraudOrCanceledSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { commissionId, status } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const commission = await updatePartnerCommission({
      workspaceId: workspace.id,
      programId,
      commissionId,
      status,
      userId: user.id,
      currency: "usd",
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action:
          status === "fraud"
            ? "commission.marked_fraud"
            : "commission.canceled",
        description: `Commission ${commissionId} marked as ${status}`,
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
