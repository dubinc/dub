"use server";

import { resolveFraudEvents } from "@/lib/api/fraud/utils";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { resolveFraudEventsSchema } from "@/lib/zod/schemas/fraud";
import { authActionClient } from "../safe-action";

export const resolveFraudEventsAction = authActionClient
  .schema(resolveFraudEventsSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { groupKey, resolutionReason } = parsedInput;

    const { canResolveFraudEvents } = getPlanCapabilities(workspace.plan);

    if (!canResolveFraudEvents) {
      throw new Error("Unauthorized.");
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    await resolveFraudEvents({
      where: {
        programId,
        groupKey,
      },
      userId: user.id,
      resolutionReason,
    });
  });
