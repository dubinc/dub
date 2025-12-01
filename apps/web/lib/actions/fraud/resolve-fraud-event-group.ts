"use server";

import { resolveFraudEventGroups } from "@/lib/api/fraud/resolve-fraud-event-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { resolveFraudEventGroupSchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

export const resolveFraudEventGroupAction = authActionClient
  .schema(resolveFraudEventGroupSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { groupId, resolutionReason } = parsedInput;

    const { canManageFraudEvents } = getPlanCapabilities(workspace.plan);

    if (!canManageFraudEvents) {
      throw new Error("Unauthorized.");
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    const fraudEventGroup = await prisma.fraudEventGroup.findUniqueOrThrow({
      where: {
        id: groupId,
      },
      select: {
        id: true,
        programId: true,
        partnerId: true,
      },
    });

    if (fraudEventGroup.programId !== programId) {
      throw new Error(
        "You are not authorized to resolve this fraud event group.",
      );
    }

    const count = await resolveFraudEventGroups({
      where: {
        id: groupId,
      },
      userId: user.id,
      ...(resolutionReason && { resolutionReason }),
    });

    // Add the resolution reason as a comment to the partner
    if (resolutionReason && count > 0) {
      await prisma.partnerComment.create({
        data: {
          programId,
          partnerId: fraudEventGroup.partnerId,
          userId: user.id,
          text: resolutionReason,
        },
      });
    }
  });
