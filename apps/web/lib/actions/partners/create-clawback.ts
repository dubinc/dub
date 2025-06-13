"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { createClawbackSchema } from "@/lib/zod/schemas/commissions";
import { authActionClient } from "../safe-action";

export const createClawbackAction = authActionClient
  .schema(createClawbackSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId, amount, reason } = parsedInput;

    await getProgramEnrollmentOrThrow({
      programId,
      partnerId,
    });

    // TODO: Implement clawback logic
  });
