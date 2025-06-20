"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { approvePartnersBulkSchema } from "@/lib/zod/schemas/partners";
import { authActionClient } from "../safe-action";

// Approve partners applications in bulk
// A referral link will be created for each partner
export const approvePartnersBulkAction = authActionClient
  .schema(approvePartnersBulkSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds } = parsedInput;

    if (partnerIds.length === 0) {
      throw new Error("No partner IDs provided.");
    }

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId: getDefaultProgramIdOrThrow(workspace),
    });

    // TODO:
    // We should offload this to a background job so we don't block the request
  });
