"use server";

import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

const declineProgramInviteSchema = z.object({
  programId: z.string(),
});

export const declineProgramInviteAction = authPartnerActionClient
  .inputSchema(declineProgramInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner } = ctx;
    const { programId } = parsedInput;

    const enrollment = await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId,
        },
        status: "invited",
      },
      data: {
        status: "declined",
      },
    });

    // Status moved to declined.
    waitUntil(queuePartnerSearchSync({ enrollmentIds: [enrollment.id] }));
  });
