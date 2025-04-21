"use server";

import { createCommissionSchema } from "@/lib/zod/schemas/commissions";
import { getLinkOrThrow } from "../../api/links/get-link-or-throw";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";

export const createCommissionAction = authActionClient
  .schema(createCommissionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;

    const {
      programId,
      partnerId,
      linkId,
      saleDate,
      saleAmount,
      invoiceId,
      customerId,
      leadDate,
    } = parsedInput;

    const [program, link] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),

      getLinkOrThrow({
        workspaceId: workspace.id,
        linkId,
      }),
    ]);

    // Validate customerId and check invoiceId
  });
