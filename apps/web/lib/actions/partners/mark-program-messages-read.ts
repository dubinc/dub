"use server";

import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

// Mark program messages as read
export const markProgramMessagesReadAction = authPartnerActionClient
  .schema(z.object({ programSlug: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const { partner } = ctx;
    const { programSlug } = parsedInput;

    const enrollment = await getProgramEnrollmentOrThrow({
      programId: programSlug,
      partnerId: partner.id,
    });

    await prisma.message.updateMany({
      where: {
        partnerId: partner.id,
        programId: enrollment.programId,
        senderPartnerId: null,
      },
      data: {
        readInApp: new Date(),
      },
    });
  });
