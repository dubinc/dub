"use server";

import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { bulkResolveFraudGroupsSchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const bulkResolveFraudGroupsAction = authActionClient
  .inputSchema(bulkResolveFraudGroupsSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { groupIds, resolutionReason } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const { canManageFraudEvents } = getPlanCapabilities(workspace.plan);

    if (!canManageFraudEvents) {
      throw new Error("Unauthorized.");
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    const fraudGroups = await prisma.fraudEventGroup.findMany({
      where: {
        id: {
          in: groupIds,
        },
        status: "pending",
      },
      select: {
        id: true,
        programId: true,
        partnerId: true,
        type: true,
      },
    });

    if (fraudGroups.length === 0) {
      return;
    }

    // Verify all groups belong to the program
    const unauthorizedGroups = fraudGroups.filter(
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
          in: fraudGroups.map(({ id }) => id),
        },
      },
      userId: user.id,
      ...(resolutionReason && { resolutionReason }),
    });

    // Add the resolution reason as a comment for each resolved fraud group
    if (resolutionReason && count > 0) {
      await prisma.partnerComment.createMany({
        data: fraudGroups.map((group) => ({
          programId,
          partnerId: group.partnerId,
          userId: user.id,
          text: resolutionReason,
          metadata: {
            source: "fraudResolution",
            groupId: group.id,
            type: group.type,
          },
        })),
      });
    }
  });
