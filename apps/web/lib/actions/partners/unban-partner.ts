"use server";

import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { banPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

const unbanPartnerSchema = banPartnerSchema.omit({
  reason: true,
});

// Unban a partner
export const unbanPartnerAction = authActionClient
  .schema(unbanPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, partnerId } = parsedInput;

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
    });

    const { program } = programEnrollment;

    if (program.workspaceId !== workspace.id) {
      throw new Error("You are not authorized to ban this partner.");
    }

    if (programEnrollment.status !== "banned") {
      throw new Error("This partner is not banned.");
    }

    const where = {
      partnerId,
      programId,
    };

    await prisma.$transaction([
      prisma.link.updateMany({
        where,
        data: {
          expiresAt: null,
        },
      }),

      prisma.programEnrollment.update({
        where: {
          partnerId_programId: where,
        },
        data: {
          status: "approved",
        },
      }),

      prisma.commission.updateMany({
        where: {
          ...where,
          status: "cancelled",
        },
        data: {
          status: "pending",
        },
      }),

      prisma.payout.updateMany({
        where: {
          ...where,
          status: "cancelled",
        },
        data: {
          status: "pending",
        },
      }),
    ]);

    waitUntil(
      (async () => {
        // TODO
        // Send email to partner about being unbanned
      })(),
    );
  });
