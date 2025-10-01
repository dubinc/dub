"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { updateDiscoveredPartnerSchema } from "@/lib/zod/schemas/partner-network";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

// Star or dismiss a partner in the partner network
export const updateDiscoveredPartnerAction = authActionClient
  .schema(updateDiscoveredPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerId, starred, ignored } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const discoveredPartner = await prisma.discoveredPartner.upsert({
      where: {
        programId_partnerId: {
          programId,
          partnerId,
        },
      },
      create: {
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
