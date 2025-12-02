"use server";

import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { bulkResolveFraudGroupsSchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

export const bulkResolveFraudGroupsAction = authActionClient
  .schema(bulkResolveFraudGroupsSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { groupIds, resolutionReason } = parsedInput;

    const { canManageFraudEvents } = getPlanCapabilities(workspace.plan);

    if (!canManageFraudEvents) {
      throw new Error("Unauthorized.");
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    const fraudEventGroups = await prisma.fraudEventGroup.findMany({
      where: {
        id: {
          in: groupIds,
        },
      },
      select: {
        id: true,
        programId: true,
        partnerId: true,
      },
    });

    if (fraudEventGroups.length === 0) {
      return;
    }

    // Verify all groups belong to the program
    const unauthorizedGroups = fraudEventGroups.filter(
      (group) => group.programId !== programId,
    );

    if (unauthorizedGroups.length > 0) {
      throw new Error(
        "You are not authorized to resolve one or more fraud event groups.",
      );
    }

    const count = await resolveFraudGroups({
      where: {
        id: {
          in: fraudEventGroups.map(({ id }) => id),
        },
      },
      userId: user.id,
      ...(resolutionReason && { resolutionReason }),
    });

    // Add the resolution reason as a comment to each unique partner
    if (resolutionReason && count > 0) {
      const uniquePartnerIds = Array.from(
        new Set(fraudEventGroups.map((group) => group.partnerId)),
      );

      await prisma.partnerComment.createMany({
        data: uniquePartnerIds.map((partnerId) => ({
          programId,
          partnerId,
          userId: user.id,
          text: resolutionReason,
        })),
      });
    }
  });
