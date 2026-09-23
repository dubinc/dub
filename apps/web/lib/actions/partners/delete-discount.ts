"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDiscountOrThrow } from "@/lib/api/partners/get-discount-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { dispatchWorkflows } from "@/lib/jobs/publish-workflows";
import { prisma } from "@/lib/prisma";
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

    await prisma.$transaction(async (tx) => {
      // Using updateMany otherwise this would fail if the discount is not a group-level discount
      await tx.partnerGroup.updateMany({
        where: {
          discountId,
        },
        data: {
          discountId: null,
        },
      });

      await tx.discount.update({
        where: {
          id: discountId,
        },
        data: {
          programId: null,
        },
      });
    });

    await dispatchWorkflows({
      name: "detach-discount-workflow",
      payload: {
        programId,
        discountId,
      },
      options: {
        label: discountId,
        deduplicationId: `detach-discount-${discountId}`,
      },
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
