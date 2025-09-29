"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { starPartnerSchema } from "@/lib/zod/schemas/partner-network";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

// Star a partner in the partner network
export const starPartnerAction = authActionClient
  .schema(starPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerId, starred } = parsedInput;

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
      },
      update: {
        starredAt: starred ? new Date() : null,
      },
    });

    return {
      starredAt: discoveredPartner.starredAt,
    };
  });
