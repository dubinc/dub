"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { createClawbackSchema } from "@/lib/zod/schemas/commissions";
import { authActionClient } from "../safe-action";

export const createClawbackAction = authActionClient
  .schema(createClawbackSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId, amount, description } = parsedInput;

    await getProgramEnrollmentOrThrow({
      programId,
      partnerId,
    });

    await createPartnerCommission({
      event: "custom",
      partnerId,
      programId,
      description,
      amount: -amount,
      quantity: 1,
      user,
      workspaceId: workspace.id,
    });
  });
