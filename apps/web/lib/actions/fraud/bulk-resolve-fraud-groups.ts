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

    const { resolvedGroupIds } = await resolveFraudGroups({
      where: {
        id: {
          in: fraudGroups.map(({ id }) => id),
        },
      },
      userId: user.id,
      ...(resolutionReason && { resolutionReason }),
    });

    // Add the resolution reason as a comment for resolved groups only (deduped per partner).
    if (resolutionReason && resolvedGroupIds.length > 0) {
      const resolvedGroupsById = new Map(
        fraudGroups.map((group) => [group.id, group]),
      );

      const resolvedGroups = resolvedGroupIds
        .map((id) => resolvedGroupsById.get(id))
        .filter((group): group is (typeof fraudGroups)[number] =>
          Boolean(group),
        );

      const uniquePartners = new Map<
        string,
        { partnerId: string; groupId: string; type: (typeof fraudGroups)[number]["type"] }
      >();

      for (const group of resolvedGroups) {
        if (!uniquePartners.has(group.partnerId)) {
          uniquePartners.set(group.partnerId, {
            partnerId: group.partnerId,
            groupId: group.id,
            type: group.type,
          });
        }
      }

      await prisma.partnerComment.createMany({
        data: Array.from(uniquePartners.values()).map((entry) => ({
          programId,
          partnerId: entry.partnerId,
          userId: user.id,
          text: resolutionReason,
          metadata: {
            source: "fraudResolution",
            groupId: entry.groupId,
            type: entry.type,
          },
        })),
      });
    }
  });
