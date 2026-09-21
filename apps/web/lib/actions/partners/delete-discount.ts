"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { softDeleteDiscount } from "@/lib/discounts/soft-delete-discount";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const deleteDiscountSchema = z.object({
  workspaceId: z.string(),
  discountId: z.string(),
});

export const deleteDiscountAction = authActionClient
  .inputSchema(deleteDiscountSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { discountId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discount = await getDiscountOrThrow({
      programId,
      discountId,
    });

    await softDeleteDiscount({
      discountId,
      programId,
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "discount.deleted",
        description: `Discount ${discountId} deleted`,
        actor: user,
        targets: [
          {
            type: "discount",
            id: discountId,
            metadata: discount,
          },
        ],
      }),
    );
  });
