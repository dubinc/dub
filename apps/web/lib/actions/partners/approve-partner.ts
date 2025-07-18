"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { approvePartnerEnrollment } from "@/lib/partners/approve-partner-enrollment";
import { approvePartnerSchema } from "@/lib/zod/schemas/partners";
import { authActionClient } from "../safe-action";

// Approve a partner application
export const approvePartnerAction = authActionClient
  .schema(approvePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId, linkId } = parsedInput;

    await approvePartnerEnrollment({
      programId,
      partnerId,
      linkId,
      userId: user.id,
    });
  });
