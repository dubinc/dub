"use server";

import { authPartnerActionClient } from "@/lib/actions/safe-action";
import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { NETWORK_PROGRAM_ID } from "@dub/utils";

export const enrollInNetworkProgramAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner } = ctx;

    if (!["approved", "trusted"].includes(partner.networkStatus)) {
      return;
    }

    await prisma.programEnrollment.upsert({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId: NETWORK_PROGRAM_ID,
        },
      },
      create: {
        id: createId({ prefix: "pge_" }),
        partnerId: partner.id,
        programId: NETWORK_PROGRAM_ID,
        status: "approved",
      },
      update: {},
    });
  },
);
