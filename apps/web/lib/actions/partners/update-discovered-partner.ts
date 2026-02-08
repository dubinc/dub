"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { updateDiscoveredPartnerSchema } from "@/lib/zod/schemas/partner-network";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Star or dismiss a partner in the partner network
export const updateDiscoveredPartnerAction = authActionClient
  .inputSchema(updateDiscoveredPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerId, starred, ignored } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discoveredPartner = await prisma.discoveredPartner.upsert({
      where: {
        programId_partnerId: {
          programId,
          partnerId,
        },
      },
      create: {
        id: createId({ prefix: "dpn_" }),
        partnerId,
        programId,
        starredAt: starred ? new Date() : null,
        ignoredAt: ignored ? new Date() : null,
      },
      update: {
        ...(starred !== undefined && {
          starredAt: starred ? new Date() : null,
        }),
        ...(ignored !== undefined && {
          ignoredAt: ignored ? new Date() : null,
        }),
      },
    });

    return {
      starredAt: discoveredPartner.starredAt,
      ignoredAt: discoveredPartner.ignoredAt,
    };
  });
